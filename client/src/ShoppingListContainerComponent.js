// @flow
import _ from 'lodash'
import low from 'lowdb'
import LocalStorage from 'lowdb/adapters/LocalStorage'
import lodashId from 'lodash-id'
import deepFreeze from 'deep-freeze'
import React, { Component } from 'react'
import {
  type SyncedShoppingList, type ShoppingList, type CompletionItem, type LocalItem, type Item, type CategoryDefinition,
  type Order, type UUID,
  createShoppingList, createSyncedShoppingList, createCompletionItem, createCategoryDefinition, createRandomUUID,
  mergeShoppingLists, createOrder
} from 'shoppinglist-shared'
import ShoppingListComponent from './ShoppingListComponent'
import { responseToJSON } from './utils';

export type ConnectionState = "disconnected" | "polling" | "socket"

export type UpdateListTitle = (newTitle: string) => void
export type CreateItem = (item: LocalItem) => void
export type DeleteItem = (id: UUID, addToRecentlyDeleted?: boolean) => void
export type UpdateItem = (id: UUID, localItem: LocalItem) => void
export type SelectOrder = (id: ?UUID) => void

type Props = {
  listid: string,
}


type ClientShoppingList = {
  previousSync: ?SyncedShoppingList,
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  orders: $ReadOnlyArray<Order>,
  selectedOrder: ?UUID,
  loaded: boolean,
  dirty: boolean,
  syncing: boolean,
  lastSyncFailed: boolean,
  connectionState: ConnectionState,
  // ShoppingList
  id: string,
  title: string,
  items: $ReadOnlyArray<Item>,
}

type State = ClientShoppingList

const initialState: ClientShoppingList = deepFreeze({
  id: "",
  title: "",
  items: [],
  previousSync: null,
  recentlyDeleted: [],
  completions: [],
  categories: [],
  orders: [],
  loaded: false,
  dirty: false,
  syncing: false,
  lastSyncFailed: false,
  connectionState: "disconnected",
})

export default class ShoppingListContainerComponent extends Component<Props, State> {
  db: Object
  socket: ?WebSocket
  supressSave: boolean
  isInSyncMethod: boolean
  waitForOnlineTimeoutId: number
  changePushSyncTimeoutId: number
  requestSyncTimeoutId: number

  constructor(props: Props) {
    super(props)

    const adapter = new LocalStorage('db')
    this.db = low(adapter)
    this.db._.mixin(lodashId)
    this.db.defaults({lists: []}).write()

    this.state = this.db.get('lists').getById(this.props.listid).value() || initialState
    // needed to work with existing local storage
    if (!this.state.orders) {
      this.state.orders = []
    }
    this.supressSave = false

    // TODO cleanup
    setInterval(() => {
      //console.log(`Socket state: ${this.socket && this.socket.readyState}`)
    }, 1000)
  }

  componentDidMount() {
    window.addEventListener('storage', this.handleStorage)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    this.initiateSyncConnection()
  }

  componentWillUnmount() {
    window.removeEventListener('storage', this.handleStorage)
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    if (this.socket != null) {
      this.socket.onclose = () => {}
      this.socket.close()
    }
  }

  componentDidUpdate() {
    if (!this.supressSave && this.state.loaded) {
      console.info('Save')
      this.db.get('lists').upsert(this.state).write()
    }
    this.supressSave = false
  }

  load(callback? : () => void) {
    console.info('load')
    this.supressSave = true
    this.setState(this.db.read().get('lists').getById(this.props.listid).value() || initialState, callback)
  }

  clearLocalStorage() {
    if (this.socket != null) {
      this.socket.onclose = () => {}
      this.socket.close()
    }
    this.db.get('lists').removeById(this.props.listid).write()
    this.load(() => {
      this.initiateSyncConnection()
    })
  }

  initiateSyncConnection() {
    this.sync()

    if (this.socket != null && this.socket.readyState === WebSocket.OPEN) {
      this.setState({ connectionState: "socket" })
      return
    }

    let base: string
    if (process.env.REACT_APP_SOCKET_URL) {
      base = process.env.REACT_APP_SOCKET_URL
    } else {
      const protocol = (window.location.protocol === "https:") ? "wss://" : "ws://"
      base = protocol + window.location.host
    }

    let onopenTimoutId: number
    this.socket = new WebSocket(base + `/api/${this.props.listid}/socket`);
    this.socket.onopen = () => {
      onopenTimoutId = setTimeout(() => {
        console.log('socket open')
        this.setState({ connectionState: "socket" })
      }, 100)
    }
    this.socket.onmessage = evt => {
      console.log('Receiced change push!')
      clearTimeout(this.changePushSyncTimeoutId)
      this.changePushSyncTimeoutId = setTimeout(() => {
        if (this.state.previousSync != null && evt.data !== this.state.previousSync.token) {
          console.log('Tokens dont match, syncing!')
          this.sync()
        } else {
          console.log('Token already up to date')
        }
      }, 300)
    }
    this.socket.onerror = () => {
      console.log('error')
      clearTimeout(onopenTimoutId)
    }
    this.socket.onclose = () => {
      clearTimeout(onopenTimoutId)
      console.log('socket closed')
      if (window.navigator.onLine) {
        console.log('socket closed, polling')
        this.setState({ connectionState: "polling" })
        setTimeout(() => this.initiateSyncConnection(), 2000)
      } else {
        console.log('socket closed, offline')
        this.setState({ connectionState: "disconnected" })
        this.waitForOnline()
      }
    }
  }

  waitForOnline() {
    console.log('checking online')
    if (window.navigator.onLine) {
      this.initiateSyncConnection()
    } else {
      window.clearTimeout(this.waitForOnlineTimeoutId)
      this.waitForOnlineTimeoutId = window.setTimeout(() => this.waitForOnline(), 10000)
    }
  }

  sync(manuallyTriggered: boolean = false) {
    window.clearTimeout(this.requestSyncTimeoutId)

    if (this.isInSyncMethod) {
      console.log('Sync concurrent entry')
      return
    }
    this.isInSyncMethod = true
    console.log('Syncing')
    this.setState({
      syncing: true
    })

    let syncPromise
    let preSyncShoppingList

    if (!this.state.loaded) {
      console.log('initial sync!')
      syncPromise = fetch(`/api/${this.props.listid}/sync`).then(responseToJSON)
    } else {
      preSyncShoppingList = this.getShoppingList(this.state)

      syncPromise = fetch(`/api/${this.props.listid}/sync`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          method: "POST",
          body: JSON.stringify({
            previousSync: this.state.previousSync,
            currentState: preSyncShoppingList
          })
        })
        .then(responseToJSON)
    }

    const completionsPromise = fetch(`/api/${this.props.listid}/completions`).then(responseToJSON)
    const categoriesPromise =  fetch(`/api/${this.props.listid}/categories`).then(responseToJSON)
    const ordersPromise =  fetch(`/api/${this.props.listid}/orders`).then(responseToJSON)

    Promise.all([syncPromise, completionsPromise, categoriesPromise, ordersPromise])
      .then(([syncJson, completionsJson, categoriesJson, ordersJson]) => {
        this.setState((prevState) => {
          const categories = categoriesJson.map(createCategoryDefinition)
          const completions = completionsJson.map(createCompletionItem)
          const orders = ordersJson.map(createOrder)

          // don't sort shopping list from server, we need it in server order for previousSync
          const serverSyncedShoppingList = createSyncedShoppingList(syncJson, null)
          const serverShoppingList = _.omit(serverSyncedShoppingList, 'token')

          let dirty, newShoppingList
          if (preSyncShoppingList != null) {
            const clientShoppingList = this.getShoppingList(prevState)
            dirty = !_.isEqual(preSyncShoppingList, clientShoppingList)
            newShoppingList = mergeShoppingLists(preSyncShoppingList, clientShoppingList, serverShoppingList, categories)
          } else {
            newShoppingList = serverShoppingList
            dirty = false
          }

          const syncState: $Shape<State> = {
            completions: completions,
            categories: categories,
            orders: orders,
            dirty: dirty,
            syncing: false,
            loaded: true,
            lastSyncFailed: false,
            previousSync: serverSyncedShoppingList,
            ...newShoppingList,
          }

          this.isInSyncMethod = false
          console.log('done syncing')

          if (syncState.dirty) {
            console.warn('dirty after sync, resyncing')
            this.requestSync(0)
          }

          return syncState
        })
      })
      .catch(e => {
        let failedState = {
          lastSyncFailed: true,
          syncing: false,
        }
        this.setState(failedState)
        this.isInSyncMethod = false
        console.log('done syncing, failed', e)
      })
  }

  getShoppingList(clientShoppingList: ClientShoppingList): ShoppingList {
    return createShoppingList(_.pick(clientShoppingList, ['id', 'title', 'items']), this.state.categories)
  }

  requestSync = (delay: number = 500) => {
      window.clearTimeout(this.requestSyncTimeoutId)
      this.requestSyncTimeoutId = window.setTimeout(this.sync.bind(this), delay)
  }

  handleStorage = (e: StorageEvent) => {
    // TODO filter for list
    this.load()
  }

  handleOnline = () => {
    this.initiateSyncConnection()
  }

  handleOffline = () => {
    console.log("offline")
    this.setState({ connectionState: "disconnected" })
    this.waitForOnline()
  }

  updateListTitle = (newTitle: string) => {
    this.setState((prevState) => {
      return {
        title: newTitle,
        dirty: true,
      }
    }, this.requestSync)
  }

  createItem = (localItem: LocalItem) => {
    const item = {...localItem, id: createRandomUUID()}
    this.setState((prevState) => {
      const recentlyDeleted = prevState.recentlyDeleted.filter(
        (delItem) => delItem.name.trim().toLowerCase() !== item.name.trim().toLowerCase()
      )
      return {
        items: [...prevState.items, item],
        recentlyDeleted: recentlyDeleted,
        dirty: true,
      }
    }, this.requestSync)
  }

  deleteItem = (id: UUID, addToRecentlyDeleted?: boolean = true) => {
    this.setState((prevState) => {
      const toDelete = prevState.items.find((item) => item.id === id)
      if (toDelete == null) {
        return {}
      }
      const localToDelete = _.omit(toDelete, 'id')
      const listItems = [...prevState.items].filter((item) => item.id !== id)

      let recentlyDeleted = prevState.recentlyDeleted
        .filter((item) => item.name.trim().toLowerCase() !== localToDelete.name.trim().toLowerCase())
      if (addToRecentlyDeleted) {
        recentlyDeleted.push(localToDelete)
      }
      recentlyDeleted = recentlyDeleted.slice(Math.max(0, recentlyDeleted.length - 10), recentlyDeleted.length)

      return {
        items: listItems,
        recentlyDeleted: recentlyDeleted,
        dirty: true,
      }
    }, this.requestSync)
  }

  updateItem = (id: UUID, localItem: LocalItem) => {
    const item = {...localItem, id: id}

    this.setState((prevState) => {
      const listItems = [...prevState.items]
      const index = _.findIndex(listItems, (item) => item.id === id)
      listItems[index] = item

      const recentlyDeleted = prevState.recentlyDeleted.filter(
        (delItem) => delItem.name.trim().toLowerCase() !== item.name.trim().toLowerCase()
      )

      return {
        items: listItems,
        recentlyDeleted: recentlyDeleted,
        dirty: true
      }
    }, this.requestSync)
  }

  selectOrder = (id: ?UUID) => {
    console.log(id)
    this.setState({
      selectedOrder: id
    })
  }

  render() {
    return (
      <div>
        {this.state.loaded &&
          <ShoppingListComponent
            shoppingList={this.getShoppingList(this.state)}
            recentlyDeleted={this.state.recentlyDeleted}
            completions={this.state.completions}
            categories={this.state.categories}
            orders={this.state.orders}
            selectedOrder={this.state.selectedOrder}
            connectionState={this.state.connectionState}
            syncing={this.state.syncing}
            lastSyncFailed={this.state.lastSyncFailed}
            dirty={this.state.dirty}
            updateListTitle={this.updateListTitle} createItem={this.createItem}
            updateItem={this.updateItem} deleteItem={this.deleteItem}
            selectOrder={this.selectOrder}
            manualSync={this.initiateSyncConnection.bind(this)}
            clearLocalStorage={this.clearLocalStorage.bind(this)}
          />
        }
      </div>
    )
  }
}
