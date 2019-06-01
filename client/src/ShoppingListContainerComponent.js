// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import React, { Component } from 'react'
import {
  type SyncedShoppingList, type ShoppingList, type CompletionItem, type LocalItem, type Item, type CategoryDefinition,
  type Order, type Change, type Diff, type UUID,
  createShoppingList, createSyncedShoppingList, createCompletionItem, createCategoryDefinition, createRandomUUID,
  mergeShoppingLists, createOrder, createChange, 
  generateAddItem, generateDeleteItem, generateUpdateItem, applyDiff, createApplicableDiff, getOnlyNewChanges,
  frecency,
} from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import { type RecentlyUsedList } from './ChooseListComponent'
import { responseToJSON } from './utils'
import { createDB, getRecentlyUsedLists } from './db'
import ShoppingListComponent from './ShoppingListComponent'

export type ConnectionState = "disconnected" | "polling" | "socket"

export type UpdateListTitle = (newTitle: string) => void
export type CreateItem = (item: LocalItem) => void
export type DeleteItem = (id: UUID, addToRecentlyDeleted?: boolean) => void
export type UpdateItem = (id: UUID, localItem: LocalItem) => void
export type SelectOrder = (id: ?UUID) => void
export type UpdateOrders = (orders: $ReadOnlyArray<Order>) => void
export type SetUsername = (username: ?string) => void
export type ApplyDiff = (diff: Diff) => void
export type CreateApplicableDiff = (diff: Diff) => ?Diff

type Props = {
  listid: string,
  up: Up
}


type ClientShoppingList = {
  previousSync: ?SyncedShoppingList,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  orders: $ReadOnlyArray<Order>,
  changes: $ReadOnlyArray<Change>,
  selectedOrder: ?UUID,
  username: ?string,
  unsyncedChanges: $ReadOnlyArray<Change>,
  loaded: boolean,
  dirty: boolean,
  syncing: boolean,
  lastSyncFailed: boolean,
  ordersChanged: boolean,
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
  completions: [],
  categories: [],
  orders: [],
  changes: [],
  selectedOrder: null,
  username: null,
  unsyncedChanges: [],
  loaded: false,
  dirty: false,
  syncing: false,
  ordersChanged: false,
  lastSyncFailed: false,
  connectionState: "disconnected",
})

export default class ShoppingListContainerComponent extends Component<Props, State> {
  db: Object
  socket: ?WebSocket
  supressSave: boolean
  isInSyncMethod: boolean
  waitForOnlineTimeoutId: TimeoutID
  changePushSyncTimeoutId: TimeoutID
  requestSyncTimeoutId: TimeoutID

  constructor(props: Props) {
    super(props)

    this.db = createDB()
    this.state = this.getStateFromLocalStorage()

    if (this.state.username == null) {
      // take username from most frecent used list 
      const otherUsername = getRecentlyUsedLists(this.db)
        .map(rul => {
          const state: State = this.db.read().get('lists').getById(rul.id).value()
          return state && state.username
        })
        .find(name => name != null)
          
      this.state = {...this.state, username: otherUsername}
    }

    this.supressSave = false
  }

  componentDidMount() {
    window.addEventListener('storage', this.handleStorage)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    this.initiateSyncConnection()

    if (this.state.loaded) {
      this.markListAsUsed()
    }
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
    this.setState(this.getStateFromLocalStorage(), callback)
  }

  getStateFromLocalStorage(): State {
    const dbState = this.db.read().get('lists').getById(this.props.listid).value()
    if (dbState) {
      // add default value for any keys not present in db
      const state = {...initialState, ...dbState}
      state.changes = state.changes.map(createChange)
      state.unsyncedChanges = state.unsyncedChanges.map(createChange)
      return state
    } else {
      return initialState
    }
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

    let onopenTimoutId: TimeoutID
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

  async sync(manuallyTriggered: boolean = false) {
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

    const preSyncUnsyncedChangesLength = this.state.unsyncedChanges.length

    const initialSync = !this.state.loaded
    let syncPromise
    let preSyncShoppingList

    if (initialSync) {
      console.log('initial sync!')
      syncPromise = this.fetch(`/api/${this.props.listid}/sync`)
    } else {
      preSyncShoppingList = this.getShoppingList(this.state)

      syncPromise = this.fetch(`/api/${this.props.listid}/sync`, {
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
    }

    const completionsPromise = this.fetch(`/api/${this.props.listid}/completions`)
    const categoriesPromise =  this.fetch(`/api/${this.props.listid}/categories`)

    let ordersPromise
    if (initialSync || !this.state.ordersChanged) {
      ordersPromise =  this.fetch(`/api/${this.props.listid}/orders`)
    } else {
      ordersPromise =  this.fetch(`/api/${this.props.listid}/orders`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          method: "PUT",
          body: JSON.stringify(this.state.orders)
        })
    }

    try {
      // don't sort shopping list from server, we need it in server order for previousSync
      const serverSyncedShoppingList = createSyncedShoppingList(await responseToJSON(await syncPromise), null)
      const categories = (await responseToJSON(await categoriesPromise)).map(createCategoryDefinition)
      const completions = (await responseToJSON(await completionsPromise)).map(createCompletionItem)
      const orders =  (await responseToJSON(await ordersPromise)).map(createOrder)

      // get changes using new changeId
      const currentChangeId = serverSyncedShoppingList.changeId
      let changesPromise
      if (this.state.changes.length > 0 && currentChangeId != null) {
        const prevChangeId = _.last(this.state.changes).id
        changesPromise = this.fetch(`/api/${this.props.listid}/changes?oldest=${prevChangeId}&newest=${currentChangeId}`)
      } else if (currentChangeId != null) {
        changesPromise = this.fetch(`/api/${this.props.listid}/changes?newest=${currentChangeId}`)
      } else {
        changesPromise = this.fetch(`/api/${this.props.listid}/changes`)
      }
      const newChanges = (await responseToJSON(await changesPromise)).map(createChange)

      this.setState((prevState) => {
        const serverShoppingList: ShoppingList = _.omit(serverSyncedShoppingList, 'token', 'changeId')

        // get new shopping list and determine if there were further local changes while syncing
        let dirty, newShoppingList
        if (preSyncShoppingList != null) {
          const clientShoppingList = this.getShoppingList(prevState)
          dirty = !_.isEqual(preSyncShoppingList, clientShoppingList)
          newShoppingList = mergeShoppingLists(preSyncShoppingList, clientShoppingList, serverShoppingList, categories)
        } else {
          newShoppingList = serverShoppingList
          dirty = false
        }

        // add newly fetched changes to local changes
        let changes
        if (newChanges.length === 0) {
          // no new changes, keep the old ones
          changes = prevState.changes
        } else if (prevState.changes.length !== 0 && _.first(newChanges).id === _.last(prevState.changes).id) {
          // the new changes connect to the local ones (latest of the old is oldest of the new), append
          changes = getOnlyNewChanges([...prevState.changes, ...newChanges.slice(1)])
        } else {
          // there are new changes which don't connect up. this means the local changes were quite old, and no longer cached by the server
          // we evict them and replace by the new ones
          changes = newChanges
        }

        const syncState: $Shape<State> = {
          completions,
          categories,
          orders,
          changes,
          dirty,
          unsyncedChanges: prevState.unsyncedChanges.slice(preSyncUnsyncedChangesLength),
          syncing: false,
          loaded: true,
          lastSyncFailed: false,
          ordersChanged: false,
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
      }, () => {
        if (initialSync) {
          this.markListAsUsed()
        }
      })
    } catch (e) {
      let failedState = {
        lastSyncFailed: true,
        syncing: false,
      }
      this.setState(failedState)
      this.isInSyncMethod = false
      console.log('done syncing, failed', e)
    }
  }

  getShoppingList(clientShoppingList: ClientShoppingList): ShoppingList {
    return createShoppingList(_.pick(clientShoppingList, ['id', 'title', 'items']), this.state.categories)
  }

  fetch(input: RequestInfo, init?: RequestOptions) {
    init = init || {}
    _.merge(init, {
      "headers": {
        "X-ShoppingList-Username": this.state.username ? encodeURIComponent(this.state.username) : ""
      }
    })
    return fetch(input, init)
  }

  markListAsUsed() {
    let listUsed : RecentlyUsedList = this.db.get('recentlyUsedLists').getById(this.props.listid).value() || {
      id: this.props.listid,
      uses: 0,
      lastUsedTimestamp: Date.now()
    }
    listUsed = {...listUsed}
    listUsed.uses = listUsed.uses + 1
    listUsed.lastUsedTimestamp = Date.now()
    if (this.state.loaded) {
      listUsed.title = this.state.title
    }
    this.db.get('recentlyUsedLists').upsert(listUsed).write()
  }

  applyDiff = (diff: Diff) => {
    this.markListAsUsed()
    
    this.setState((prevState) => {
      try {
        const localChange: Change = {
          id: createRandomUUID(),
          username: this.state.username,
          date: new Date(),
          diffs: [diff],
        }
        const newList = applyDiff(this.getShoppingList(prevState), diff)
        return {
          ...newList,
          unsyncedChanges: [...prevState.unsyncedChanges, localChange],
          dirty: true,
        }
      } catch (e) {
        console.error('Error while applying diff', diff, e)
      }
    }, this.requestSync)
  }

  createApplicableDiff = (diff: Diff): ?Diff => {
    return createApplicableDiff(this.getShoppingList(this.state), diff)
  }

  requestSync = (delay: number = 1000) => {
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
    this.markListAsUsed()

    this.setState((prevState) => {
      return {
        title: newTitle,
        dirty: true,
      }
    }, this.requestSync)
  }

  createItem = (localItem: LocalItem) => {
    const item = {...localItem, id: createRandomUUID()}
    try {
      const diff = generateAddItem(item)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  deleteItem = (id: UUID) => {
    try {
      const diff = generateDeleteItem(this.getShoppingList(this.state), id)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  updateItem = (id: UUID, localItem: LocalItem) => {
    const item = {...localItem, id: id}
    try {
      const diff = generateUpdateItem(this.getShoppingList(this.state), item)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }

  }

  selectOrder = (id: ?UUID) => {
    this.setState({
      selectedOrder: id
    })
  }

  updateOrders = (orders: $ReadOnlyArray<Order>) => {
    this.markListAsUsed()

    this.setState({
      dirty: true,
      ordersChanged: true,
      orders: orders
    }, this.requestSync)
  }

  setUsername = (username: ?string) => {
    if (username != null) {
      username = username.trim()
      if (username === '') {
        username = null
      }      
    }
    this.setState((prevState) => ({ 
      username,
      unsyncedChanges: prevState.unsyncedChanges.map( c => ({ ...c, username }) )
    }))
  }

  render() {
    return (
      <div>
        {this.state.loaded &&
          <ShoppingListComponent
            shoppingList={this.getShoppingList(this.state)}
            completions={this.state.completions}
            categories={this.state.categories}
            orders={this.state.orders}
            changes={this.state.changes}
            selectedOrder={this.state.selectedOrder}
            username={this.state.username}
            unsyncedChanges={this.state.unsyncedChanges}
            connectionState={this.state.connectionState}
            syncing={this.state.syncing}
            lastSyncFailed={this.state.lastSyncFailed}
            dirty={this.state.dirty}
            updateListTitle={this.updateListTitle} createItem={this.createItem}
            updateItem={this.updateItem} deleteItem={this.deleteItem}
            selectOrder={this.selectOrder} updateOrders={this.updateOrders}
            setUsername={this.setUsername}
            applyDiff={this.applyDiff}
            createApplicableDiff={this.createApplicableDiff}
            manualSync={this.initiateSyncConnection.bind(this)}
            clearLocalStorage={this.clearLocalStorage.bind(this)}
            up={this.props.up}
          />
        }
      </div>
    )
  }
}
