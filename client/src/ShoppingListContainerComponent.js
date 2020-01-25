// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import React, { Component } from 'react'
import {
  type SyncedShoppingList, type SyncRequest, type ShoppingList, type CompletionItem, type LocalItem, type Item, type CategoryDefinition,
  type Order, type Change, type Diff, type UUID,
  createShoppingList, createCompletionItem, createRandomUUID,
  mergeShoppingLists, createChange, createSyncResponse, normalizeCompletionName,
  generateAddItem, generateDeleteItem, generateUpdateItem, applyDiff, createApplicableDiff, getOnlyNewChanges,
} from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import { type RecentlyUsedList } from './ChooseListComponent'
import { responseToJSON } from './utils'
import { createDB, getRecentlyUsedLists } from './db'
import ShoppingListComponent from './ShoppingListComponent'

export type ConnectionState = "disconnected" | "polling" | "socket"

export type UpdateListTitle = (newTitle: string) => void
export type CreateItem = (item: LocalItem) => void
export type DeleteItem = (id: UUID) => void
export type UpdateItem = (id: UUID, localItem: LocalItem) => void
export type SelectOrder = (id: ?UUID) => void
export type UpdateOrders = (orders: $ReadOnlyArray<Order>) => void
export type SetUsername = (username: ?string) => void
export type ApplyDiff = (diff: Diff) => void
export type CreateApplicableDiff = (diff: Diff) => ?Diff
export type DeleteCompletion = (completionName: string) => void

type Props = {
  listid: string,
  up: Up
}


type ClientShoppingList = {
  previousSync: ?SyncedShoppingList,
  completions: $ReadOnlyArray<CompletionItem>,
  deletedCompletions: $ReadOnlyArray<string>,
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
  deletedCompletions: [],
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
      console.info('LOCALSTORAGE', 'Scheduled save')
      this.save()
    }
    this.supressSave = false
  }
  
  save = _.debounce(() => {
    const state = _.cloneDeep(this.state)
    console.info('LOCALSTORAGE',  'Save')
    try {
      this.db.get('lists').upsert(state).write()
    } catch (e) {
      console.info('LOCALSTORAGE',  'Save failed (probably due to quota)', e)
    }
  }, 500)

  load(callback? : () => void) {
    console.info('LOCALSTORAGE', 'Load')
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
        console.log('SOCKET', 'socket open')
        this.setState({ connectionState: "socket" })
      }, 100)
    }
    this.socket.onmessage = evt => {
      console.log('SOCKET', 'Receiced change push!')
      clearTimeout(this.changePushSyncTimeoutId)
      this.changePushSyncTimeoutId = setTimeout(() => {
        if (this.state.previousSync != null && evt.data !== this.state.previousSync.token) {
          console.log('SOCKET', 'Tokens don\'t match, syncing!')
          this.sync()
        } else {
          console.log('SOCKET', 'Token already up to date')
        }
      }, 300)
    }
    this.socket.onerror = () => {
      console.log('SOCKET', 'error')
      clearTimeout(onopenTimoutId)
    }
    this.socket.onclose = () => {
      clearTimeout(onopenTimoutId)
      console.log('SOCKET', 'socket closed')
      if (window.navigator.onLine) {
        console.log('SOCKET', 'socket closed, polling')
        this.setState({ connectionState: "polling" })
        setTimeout(() => this.initiateSyncConnection(), 2000)
      } else {
        console.log('SOCKET', 'socket closed, offline')
        this.setState({ connectionState: "disconnected" })
        this.waitForOnline()
      }
    }
  }

  waitForOnline() {
    console.log('SYNC', 'checking online')
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
      console.log('SYNC', 'Sync concurrent entry')
      return
    }
    this.isInSyncMethod = true
    console.log('SYNC', 'Syncing')
    this.setState({
      syncing: true
    })

    const preSyncUnsyncedChangesLength = this.state.unsyncedChanges.length
    const preSyncDeletedCompletions = this.state.deletedCompletions

    const initialSync = !this.state.loaded
    let syncPromise
    let preSyncShoppingList

    if (!initialSync && this.state.previousSync != null) {
      const previousSync = this.state.previousSync
      preSyncShoppingList = this.getShoppingList(this.state)

      const syncRequest: SyncRequest = {
        previousSync: previousSync,
        currentState: preSyncShoppingList,
        includeInResponse: ['changes', 'categories', 'completions', 'orders'],
        //categories: [],
        orders: this.state.ordersChanged ? this.state.orders : undefined,
        deleteCompletions: this.state.deletedCompletions
      }

      syncPromise = this.fetch(`/api/${this.props.listid}/sync`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(syncRequest)
      })
    } else {
      console.log('SYNC', 'initial sync!')
      syncPromise = this.fetch(`/api/${this.props.listid}/sync?includeInResponse=changes&includeInResponse=categories&includeInResponse=completions&includeInResponse=orders`)
    
    }
    try {
      const syncResponse = createSyncResponse(await responseToJSON(await syncPromise))

      const serverSyncedShoppingList = syncResponse.list
      const newChanges: $ReadOnlyArray<Change> = syncResponse.changes || []
      const categories: $ReadOnlyArray<CategoryDefinition> = syncResponse.categories || []
      const orders: $ReadOnlyArray<Order> = syncResponse.orders || []
      const completions: $ReadOnlyArray<CompletionItem> = syncResponse.completions || []

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

        // retain completion deletions performed during sync
        const unsyncedDeletedCompletions = prevState.deletedCompletions.filter(name => preSyncDeletedCompletions.indexOf(normalizeCompletionName(name)) === -1)
        dirty = dirty || unsyncedDeletedCompletions.length > 0

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
          completions: completions.filter(completionItem => unsyncedDeletedCompletions.indexOf(normalizeCompletionName(completionItem.name)) === -1),
          categories,
          orders,
          changes,
          dirty,
          deletedCompletions: unsyncedDeletedCompletions,
          unsyncedChanges: prevState.unsyncedChanges.slice(preSyncUnsyncedChangesLength),
          syncing: false,
          loaded: true,
          lastSyncFailed: false,
          ordersChanged: false,
          previousSync: serverSyncedShoppingList,
          ...newShoppingList,
        }

        console.log('SYNC', 'deletedCompletions', syncState.deletedCompletions)

        this.isInSyncMethod = false
        console.log('SYNC', 'done syncing')

        if (syncState.dirty) {
          console.warn('SYNC', 'dirty after sync, resyncing')
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
      console.log('SYNC', 'done syncing, failed', e)
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

  createCompletionsStateUpdate(state: State, updatedItem: Item): { completions: $ReadOnlyArray<CompletionItem>, deletedCompletions: $ReadOnlyArray<string> } {
    const completionItem = createCompletionItem(_.pick(updatedItem, 'name', 'category'))
    const completionName = normalizeCompletionName(completionItem.name)
    if (completionName.length === 0) {
      return {}
    } 

    const entryIdx = _.findIndex(state.completions, i => normalizeCompletionName(i.name) === completionName)

    let completions = [...state.completions]
    if (entryIdx === -1) {
      completions.push(completionItem)
    } else {
      completions.splice(entryIdx, 1, completionItem)
    }

    return {
      completions,
      deletedCompletions: state.deletedCompletions.filter(name => normalizeCompletionName(name) !== completionName),
    }
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

        let completionStateUpdate = {}
        if (diff.item != null) {
          completionStateUpdate = this.createCompletionsStateUpdate(prevState, diff.item)
        }

        return {
          ...newList,
          unsyncedChanges: [...prevState.unsyncedChanges, localChange],
          ...completionStateUpdate,
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

  deleteCompletion = (completionName: string) => {
    const normalizedCompletionName = normalizeCompletionName(completionName)
    this.setState((prevState) => ({
      deletedCompletions: [...prevState.deletedCompletions, normalizedCompletionName],
      completions: prevState.completions.filter(completion => normalizeCompletionName(completion.name) !== normalizedCompletionName),
      dirty: true,
    }), this.requestSync)
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
            deleteCompletion={this.deleteCompletion}
            manualSync={this.initiateSyncConnection.bind(this)}
            clearLocalStorage={this.clearLocalStorage.bind(this)}
            up={this.props.up}
          />
        }
      </div>
    )
  }
}
