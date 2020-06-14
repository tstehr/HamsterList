import deepFreeze from 'deep-freeze'
import Emittery from 'emittery'
import _ from 'lodash'
import {
  applyDiff,
  CategoryDefinition,
  Change,
  CompletionItem,
  createApplicableDiff,
  createChange,
  createCompletionItem,
  createRandomUUID,
  createShoppingList,
  createSyncResponse,
  Diff,
  generateAddItem,
  generateDeleteItem,
  generateUpdateItem,
  getOnlyNewChanges,
  Item,
  LocalItem,
  mergeShoppingLists,
  normalizeCompletionName,
  Order,
  ShoppingList,
  SyncedShoppingList,
  SyncRequest,
  UUID,
} from 'shoppinglist-shared'
import { RecentlyUsedList } from './ChooseListComponent'
import { createDB, DB, getRecentlyUsedLists } from './db'
import { responseToJSON } from './utils'

export type ConnectionState = 'disconnected' | 'polling' | 'socket'
export type UpdateListTitle = (newTitle: string) => void
export type CreateItem = (item: LocalItem) => void
export type DeleteItem = (id: UUID) => void
export type UpdateItem = (id: UUID, localItem: LocalItem) => void
export type SelectOrder = (id?: UUID | null) => void
export type UpdateCategories = (categories: readonly CategoryDefinition[]) => void
export type UpdateOrders = (orders: readonly Order[]) => void
export type SetUsername = (username?: string | null) => void
export type ApplyDiff = (diff: Diff) => void
export type CreateApplicableDiff = (diff: Diff) => Diff | undefined | null
export type DeleteCompletion = (completionName: string) => void

export interface ClientShoppingList {
  previousSync: SyncedShoppingList | undefined | null
  completions: readonly CompletionItem[]
  deletedCompletions: readonly string[]
  categories: readonly CategoryDefinition[]
  orders: readonly Order[]
  changes: readonly Change[]
  selectedOrder: UUID | undefined | null
  username: string | undefined | null
  unsyncedChanges: readonly Change[]
  loaded: boolean
  dirty: boolean
  syncing: boolean
  lastSyncFailed: boolean
  categoriesChanged: boolean
  ordersChanged: boolean
  connectionState: ConnectionState
  // ShoppingList
  id: string
  title: string
  items: readonly Item[]
}

export const initialState: ClientShoppingList = deepFreeze({
  id: '',
  title: '',
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
  categoriesChanged: false,
  ordersChanged: false,
  lastSyncFailed: false,
  connectionState: 'disconnected',
})

interface CompletionStateUpdate {
  completions?: readonly CompletionItem[]
  deletedCompletions?: readonly string[]
}

@Emittery.mixin('emitter')
class SyncingCore {
  state: ClientShoppingList
  db: DB
  socket: WebSocket | undefined | null
  supressSave = false
  isInSyncMethod = false
  waitForOnlineTimeoutID = -1
  changePushSyncTimeoutID = -1
  requestSyncTimeoutID = -1

  constructor(private listid: string) {
    this.db = createDB()
    this.state = this.getStateFromLocalStorage()

    if (this.state.username == null) {
      // take username from most frecent used list
      const otherUsername = getRecentlyUsedLists(this.db)
        .map((rul) => {
          const state = this.db.read().get('lists').getById(rul.id).value()
          return state?.username
        })
        .find((name) => name != null)
      this.state = { ...this.state, username: otherUsername }
    }
  }

  setState(
    state:
      | ((prevState: Readonly<ClientShoppingList>) => Partial<ClientShoppingList> | null)
      | (Partial<ClientShoppingList> | null),
    callback?: () => void
  ): void {
    const newState = typeof state === 'function' ? state(this.state) : state
    if (newState !== null) {
      this.state = {
        ...this.state,
        ...newState,
      }

      this.emitter.emit('change', { clientShoppingList: this.state })

      if (!this.supressSave && this.state.loaded) {
        console.info('LOCALSTORAGE', 'Scheduled save')
        this.save()
      }

      this.supressSave = false
    }
    if (callback) {
      callback()
    }
  }

  init(): void {
    window.addEventListener('storage', this.handleStorage)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    this.initiateSyncConnection()

    if (this.state.loaded) {
      this.markListAsUsed()
    }
  }

  close(): void {
    window.removeEventListener('storage', this.handleStorage)
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    if (this.socket != null) {
      this.socket.onclose = null

      this.socket.close()
    }
  }

  save = _.debounce((): void => {
    const state = _.cloneDeep(this.state)

    console.info('LOCALSTORAGE', 'Save')

    try {
      this.db.get('lists').upsert(state).write()
    } catch (e) {
      console.info('LOCALSTORAGE', 'Save failed (probably due to quota)', e)
    }
  }, 500)

  load(): void {
    console.info('LOCALSTORAGE', 'Load')
    this.supressSave = true
    const newState = this.getStateFromLocalStorage()
    this.setState(newState, () => {
      if (!newState.loaded) {
        this.initiateSyncConnection()
      }
    })
  }

  getStateFromLocalStorage(): ClientShoppingList {
    const dbState = this.db.read().get('lists').getById(this.listid).value()

    if (dbState) {
      // add default value for any keys not present in db
      const state = { ...initialState, ...dbState }
      state.changes = state.changes.map(createChange)
      state.unsyncedChanges = state.unsyncedChanges.map(createChange)
      return state
    } else {
      return initialState
    }
  }

  clearLocalStorage(): void {
    if (this.socket != null) {
      this.socket.onclose = null

      this.socket.close()
    }

    this.db.get('lists').removeById(this.listid).write()
    this.load()
  }

  initiateSyncConnection(): void {
    this.sync()

    if (this.socket != null && this.socket.readyState === WebSocket.OPEN) {
      this.setState({
        connectionState: 'socket',
      })
      return
    }

    let base: string

    if (process.env.REACT_APP_SOCKET_URL) {
      base = process.env.REACT_APP_SOCKET_URL
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
      base = protocol + window.location.host
    }

    let onopenTimeoutID: number
    this.socket = new WebSocket(base + `/api/${this.listid}/socket`)

    this.socket.onopen = (): void => {
      onopenTimeoutID = window.setTimeout((): void => {
        console.log('SOCKET', 'socket open')
        this.setState({
          connectionState: 'socket',
        })
      }, 100)
    }

    this.socket.onmessage = (evt): void => {
      console.log('SOCKET', 'Receiced change push!')
      clearTimeout(this.changePushSyncTimeoutID)
      this.changePushSyncTimeoutID = window.setTimeout((): void => {
        if (this.state.previousSync != null && evt.data !== this.state.previousSync.token) {
          console.log('SOCKET', "Tokens don't match, syncing!")
          this.sync()
        } else {
          console.log('SOCKET', 'Token already up to date')
        }
      }, 300)
    }

    this.socket.onerror = (): void => {
      console.log('SOCKET', 'error')
      clearTimeout(onopenTimeoutID)
    }

    this.socket.onclose = (): void => {
      clearTimeout(onopenTimeoutID)
      console.log('SOCKET', 'socket closed')

      if (window.navigator.onLine) {
        console.log('SOCKET', 'socket closed, polling')
        this.setState({
          connectionState: 'polling',
        })
        window.setTimeout(() => this.initiateSyncConnection(), 2000)
      } else {
        console.log('SOCKET', 'socket closed, offline')
        this.setState({
          connectionState: 'disconnected',
        })
        this.waitForOnline()
      }
    }
  }

  waitForOnline(): void {
    console.log('SYNC', 'checking online')

    if (window.navigator.onLine) {
      this.initiateSyncConnection()
    } else {
      window.clearTimeout(this.waitForOnlineTimeoutID)
      this.waitForOnlineTimeoutID = window.setTimeout(() => this.waitForOnline(), 10000)
    }
  }

  async sync(): Promise<void> {
    window.clearTimeout(this.requestSyncTimeoutID)

    if (this.isInSyncMethod) {
      console.log('SYNC', 'Sync concurrent entry')
      return
    }

    this.isInSyncMethod = true
    console.log('SYNC', 'Syncing')
    this.setState({
      syncing: true,
    })

    const preSyncCategories = this.state.categories
    const preSyncOrders = this.state.orders
    const preSyncDeletedCompletions = this.state.deletedCompletions
    const preSyncUnsyncedChangesLength = this.state.unsyncedChanges.length

    const initialSync = !this.state.loaded
    let syncPromise
    let preSyncShoppingList: ShoppingList | undefined = undefined

    if (!initialSync && this.state.previousSync != null) {
      const previousSync = this.state.previousSync
      preSyncShoppingList = this.getShoppingList(this.state)
      const syncRequest: SyncRequest = {
        previousSync: previousSync,
        currentState: preSyncShoppingList,
        includeInResponse: ['changes', 'categories', 'completions', 'orders'],
        categories: this.state.categoriesChanged ? preSyncCategories : undefined,
        orders: this.state.ordersChanged ? preSyncOrders : undefined,
        deleteCompletions: preSyncDeletedCompletions,
      }
      syncPromise = this.fetch(`/api/${this.listid}/sync`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(syncRequest),
      })
    } else {
      console.log('SYNC', 'initial sync!')
      syncPromise = this.fetch(
        `/api/${this.listid}/sync?includeInResponse=changes&includeInResponse=categories&includeInResponse=completions&includeInResponse=orders`
      )
    }

    try {
      const syncResponse = createSyncResponse(await responseToJSON(await syncPromise))
      const serverSyncedShoppingList = syncResponse.list
      const newServerChanges: readonly Change[] = syncResponse.changes ?? []
      const serverCategories: readonly CategoryDefinition[] = syncResponse.categories ?? []
      const serverOrders: readonly Order[] = syncResponse.orders ?? []
      const completions: readonly CompletionItem[] = syncResponse.completions ?? []
      this.setState(
        (prevState) => {
          const serverShoppingList: ShoppingList = _.omit(serverSyncedShoppingList, 'token', 'changeId')

          // get new shopping list and determine if there were further local changes while syncing
          let dirty, newShoppingList
          if (preSyncShoppingList != null) {
            const clientShoppingList = this.getShoppingList(prevState)
            dirty = !_.isEqual(preSyncShoppingList, clientShoppingList)
            newShoppingList = mergeShoppingLists(preSyncShoppingList, clientShoppingList, serverShoppingList, serverCategories)
          } else {
            newShoppingList = serverShoppingList
            dirty = false
          }

          // retain completion deletions performed during sync
          const unsyncedDeletedCompletions = prevState.deletedCompletions.filter(
            (name) => !preSyncDeletedCompletions.includes(normalizeCompletionName(name))
          )
          dirty = dirty || unsyncedDeletedCompletions.length > 0 // add newly fetched changes to local changes

          // apply new categories only if no client-side changes
          let categories, categoriesChanged
          if (_.isEqual(preSyncCategories, prevState.categories)) {
            categories = serverCategories
            categoriesChanged = false
          } else {
            categories = prevState.categories
            categoriesChanged = !_.isEqual(categories, serverCategories)
            dirty = dirty || categoriesChanged
          }

          // apply new orders only if no client-side changes
          let orders, ordersChanged
          if (_.isEqual(preSyncOrders, prevState.orders)) {
            orders = serverOrders
            ordersChanged = false
          } else {
            orders = prevState.orders
            ordersChanged = !_.isEqual(orders, serverOrders)
            dirty = dirty || ordersChanged
          }

          // merge changes
          let changes
          if (newServerChanges.length === 0) {
            // no new changes, keep the old ones
            changes = prevState.changes
          } else if (prevState.changes.length !== 0 && _.first(newServerChanges)?.id === _.last(prevState.changes)?.id) {
            // the new changes connect to the local ones (latest of the old is oldest of the new), append
            changes = getOnlyNewChanges([...prevState.changes, ...newServerChanges.slice(1)])
          } else {
            // there are new changes which don't connect up. this means the local changes were quite old, and no longer cached by the server
            // we evict them and replace by the new ones
            changes = newServerChanges
          }

          const syncState = {
            completions: completions.filter(
              (completionItem) => !unsyncedDeletedCompletions.includes(normalizeCompletionName(completionItem.name))
            ),
            categories,
            orders,
            changes,
            dirty,
            deletedCompletions: unsyncedDeletedCompletions,
            unsyncedChanges: prevState.unsyncedChanges.slice(preSyncUnsyncedChangesLength),
            syncing: false,
            loaded: true,
            lastSyncFailed: false,
            categoriesChanged,
            ordersChanged,
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
        },
        (): void => {
          if (initialSync) {
            this.markListAsUsed()
          }
        }
      )
    } catch (e) {
      const failedState = {
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

  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    init = init ?? {}

    _.merge(init, {
      headers: {
        'X-ShoppingList-Username': this.state.username ? encodeURIComponent(this.state.username) : '',
      },
    })

    return fetch(input, init)
  }

  markListAsUsed(): void {
    let listUsed: RecentlyUsedList = this.db.get('recentlyUsedLists').getById(this.listid).value() ?? {
      id: this.listid,
      uses: 0,
      lastUsedTimestamp: Date.now(),
    }
    listUsed = { ...listUsed }
    listUsed.uses = listUsed.uses + 1
    listUsed.lastUsedTimestamp = Date.now()

    if (this.state.loaded) {
      listUsed.title = this.state.title
    }

    this.db.get('recentlyUsedLists').upsert(listUsed).value()

    this.save()
  }

  createCompletionsStateUpdate(state: ClientShoppingList, updatedItem: Item): CompletionStateUpdate {
    const completionItem = createCompletionItem(_.pick(updatedItem, 'name', 'category'))
    const completionName = normalizeCompletionName(completionItem.name)

    if (completionName.length === 0) {
      return {}
    }

    const entryIdx = _.findIndex(state.completions, (i) => normalizeCompletionName(i.name) === completionName)

    const completions = [...state.completions]

    if (entryIdx === -1) {
      completions.push(completionItem)
    } else {
      completions.splice(entryIdx, 1, completionItem)
    }

    return {
      completions,
      deletedCompletions: state.deletedCompletions.filter((name) => normalizeCompletionName(name) !== completionName),
    }
  }

  applyDiff = (diff: Diff): void => {
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

        let completionStateUpdate: CompletionStateUpdate = {}
        if ('item' in diff && diff.item != null) {
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
      return {}
    }, this.requestSync)
  }

  createApplicableDiff = (diff: Diff): Diff | undefined | null => {
    return createApplicableDiff(this.getShoppingList(this.state), diff)
  }

  deleteCompletion = (completionName: string): void => {
    const normalizedCompletionName = normalizeCompletionName(completionName)
    this.setState(
      (prevState) => ({
        deletedCompletions: [...prevState.deletedCompletions, normalizedCompletionName],
        completions: prevState.completions.filter(
          (completion) => normalizeCompletionName(completion.name) !== normalizedCompletionName
        ),
        dirty: true,
      }),
      this.requestSync
    )
  }

  updateListTitle = (newTitle: string): void => {
    this.markListAsUsed()
    this.setState((prevState) => {
      return {
        title: newTitle,
        dirty: true,
      }
    }, this.requestSync)
  }

  createItem = (localItem: LocalItem): void => {
    const item = { ...localItem, id: createRandomUUID() }

    try {
      const diff = generateAddItem(item)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  deleteItem = (id: UUID): void => {
    try {
      const diff = generateDeleteItem(this.getShoppingList(this.state), id)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  updateItem = (id: UUID, localItem: LocalItem): void => {
    const item = { ...localItem, id: id }

    try {
      const diff = generateUpdateItem(this.getShoppingList(this.state), item)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  selectOrder = (id?: UUID | null): void => {
    this.setState({
      selectedOrder: id,
    })
  }

  updateCategories = (categories: readonly CategoryDefinition[]): void => {
    this.markListAsUsed()
    this.setState(
      {
        dirty: true,
        categoriesChanged: true,
        categories: categories,
      },
      this.requestSync
    )
  }

  updateOrders = (orders: readonly Order[]): void => {
    this.markListAsUsed()
    this.setState(
      {
        dirty: true,
        ordersChanged: true,
        orders: orders,
      },
      this.requestSync
    )
  }

  setUsername = (username?: string | null): void => {
    if (username != null) {
      username = username.trim()

      if (username === '') {
        username = null
      }
    }

    this.setState((prevState) => ({
      username,
      unsyncedChanges: prevState.unsyncedChanges.map((c) => ({ ...c, username })),
    }))
  }

  requestSync = (delay = 1000): void => {
    window.clearTimeout(this.requestSyncTimeoutID)
    this.requestSyncTimeoutID = window.setTimeout(() => {
      this.sync()
    }, delay)
  }

  handleStorage = (e: StorageEvent): void => {
    // TODO filter for list
    this.load()
  }

  handleOnline = (): void => {
    this.initiateSyncConnection()
  }

  handleOffline = (): void => {
    console.log('offline')
    this.setState({
      connectionState: 'disconnected',
    })
    this.waitForOnline()
  }
}

type SyncingCoreEmitter = Emittery.Typed<{
  change: { clientShoppingList: ClientShoppingList }
}>

interface SyncingCore extends Omit<SyncingCoreEmitter, 'emit' | 'emitSerial'> {
  emitter: SyncingCoreEmitter
}

export default SyncingCore
