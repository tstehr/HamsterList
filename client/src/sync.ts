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
  getLiteralKeys,
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
import updateInArray from 'shoppinglist-shared/build/util/updateInArray'
import DB, { getRecentlyUsedLists, RecentlyUsedList, RECENTLY_USED_KEY } from './db'
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
export type CreateApplicableDiff = (diff: Diff) => Diff | null
export type DeleteCompletion = (completionName: string) => void
export type AddCompletion = (completion: CompletionItem) => void

export interface PersistedClientShoppingList {
  previousSync: SyncedShoppingList | null
  completions: readonly CompletionItem[]
  deletedCompletions: readonly string[]
  addedCompletions: readonly string[]
  categories: readonly CategoryDefinition[]
  orders: readonly Order[]
  changes: readonly Change[]
  selectedOrder: UUID | null
  username: string | null
  unsyncedChanges: readonly Change[]
  loaded: boolean
  dirty: boolean
  categoriesChanged: boolean
  ordersChanged: boolean
  // ShoppingList
  id: string
  title: string
  items: readonly Item[]
}

export interface EphemeralClientShoppingList {
  syncing: boolean
  lastSyncFailed: boolean
  connectionState: ConnectionState
}

export type ClientShoppingList = PersistedClientShoppingList & EphemeralClientShoppingList

export const persistedInitialState: PersistedClientShoppingList = deepFreeze({
  id: '',
  title: '',
  items: [],
  previousSync: null,
  completions: [],
  deletedCompletions: [],
  addedCompletions: [],
  categories: [],
  orders: [],
  changes: [],
  selectedOrder: null,
  username: null,
  unsyncedChanges: [],
  dirty: false,
  loaded: false,
  categoriesChanged: false,
  ordersChanged: false,
})

export const ephemeralInitialState: EphemeralClientShoppingList = deepFreeze({
  syncing: false,
  lastSyncFailed: false,
  connectionState: 'disconnected',
})

export const initialState: ClientShoppingList = deepFreeze({
  ...persistedInitialState,
  ...ephemeralInitialState,
})

export function getPersistedState(state: ClientShoppingList): PersistedClientShoppingList {
  return _.pick(state, getLiteralKeys(persistedInitialState))
}

export function getEpehemralState(state: ClientShoppingList): EphemeralClientShoppingList {
  return _.pick(state, getLiteralKeys(ephemeralInitialState))
}

interface CompletionStateUpdate {
  completions?: readonly CompletionItem[]
  deletedCompletions?: readonly string[]
}

@Emittery.mixin('emitter')
class SyncingCore {
  state: ClientShoppingList
  db: DB
  socket: WebSocket | undefined
  waitForOnlineTimeoutID = -1
  changePushSyncTimeoutID = -1
  requestSyncTimeoutID = -1

  constructor(private listid: string) {
    this.db = new DB()
    this.state = {
      ...ephemeralInitialState,
      ...this.getPersistedStateFromLocalStorage(),
    }

    if (this.state.username == null) {
      // take username from most frecent used list
      const otherUsername =
        getRecentlyUsedLists(this.db)
          .map((rul) => {
            const state = this.db.getList(rul.id)
            return state?.username
          })
          .find((name) => name != null) ?? null
      this.state = { ...this.state, username: otherUsername }
    }
  }

  setState(state: Partial<ClientShoppingList>, suppressSave = false): void {
    // update state
    this.state = {
      ...this.state,
      ...state,
    }

    // this.info('STATE', this.state)

    // emit change event
    this.emitter.emit('change', { clientShoppingList: this.state })

    // save new state to local storage
    if (!suppressSave && this.state.loaded) {
      this.info('LOCALSTORAGE', 'Scheduled save')
      this.save()
    }
  }

  init(): void {
    this.db.on('listChange', this.handleListChange)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    this.initiateSyncConnection()

    if (this.state.loaded) {
      this.markListAsUsed()
    }
  }

  close(): void {
    this.db.off('listChange', this.handleListChange)
    this.db.close()
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    if (this.socket) {
      this.socket.onclose = null

      this.socket.close()
    }
  }

  save = _.debounce((): void => {
    this.info('LOCALSTORAGE', 'Save')

    try {
      this.db.updateList(getPersistedState(this.state))
    } catch (e) {
      this.log('error', 'LOCALSTORAGE', 'Save failed (probably due to quota)', e)
    }
  }, 500)

  load(): void {
    this.info('LOCALSTORAGE', 'Load')
    const newState = this.getPersistedStateFromLocalStorage()
    this.setState(newState, true)
    if (!newState.loaded) {
      this.initiateSyncConnection()
    }
  }

  getPersistedStateFromLocalStorage(): PersistedClientShoppingList {
    const dbState = this.db.getList(this.listid)

    if (dbState) {
      // add default value for any keys not present in db
      const persistedState = { ...persistedInitialState, ...dbState }
      persistedState.changes = persistedState.changes.map(createChange)
      persistedState.unsyncedChanges = persistedState.unsyncedChanges.map(createChange)
      return persistedState
    } else {
      return persistedInitialState
    }
  }

  clearLocalStorage(): void {
    if (this.socket) {
      this.socket.onclose = null

      this.socket.close()
    }

    this.db.removeList(this.listid)
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
        this.info('SOCKET', 'socket open')
        this.setState({
          connectionState: 'socket',
        })
      }, 100)
    }

    this.socket.onmessage = (evt): void => {
      this.info('SOCKET', 'Received change push!')
      clearTimeout(this.changePushSyncTimeoutID)
      this.changePushSyncTimeoutID = window.setTimeout((): void => {
        if (this.state.previousSync != null && evt.data !== this.state.previousSync.token) {
          this.info('SOCKET', "Tokens don't match, syncing!")
          this.sync()
        } else {
          this.info('SOCKET', 'Token already up to date')
        }
      }, 300)
    }

    this.socket.onerror = (): void => {
      this.info('SOCKET', 'error')
      clearTimeout(onopenTimeoutID)
    }

    this.socket.onclose = (): void => {
      clearTimeout(onopenTimeoutID)
      this.info('SOCKET', 'socket closed')

      if (window.navigator.onLine) {
        this.info('SOCKET', 'socket closed, polling')
        this.setState({
          connectionState: 'polling',
        })
        window.setTimeout(() => this.initiateSyncConnection(), 2000)
      } else {
        this.info('SOCKET', 'socket closed, offline')
        this.setState({
          connectionState: 'disconnected',
        })
        this.waitForOnline()
      }
    }
  }

  waitForOnline(): void {
    this.info('SYNC', 'checking online')

    if (window.navigator.onLine) {
      this.initiateSyncConnection()
    } else {
      window.clearTimeout(this.waitForOnlineTimeoutID)
      this.waitForOnlineTimeoutID = window.setTimeout(() => this.waitForOnline(), 10000)
    }
  }

  async sync(): Promise<void> {
    window.clearTimeout(this.requestSyncTimeoutID)

    if (this.state.syncing) {
      this.info('SYNC', 'Sync concurrent entry')
      return
    }

    this.info('SYNC', 'Syncing')
    this.setState({
      syncing: true,
    })

    const preSyncCategories = this.state.categories
    const preSyncOrders = this.state.orders
    const preSyncAddedCompletions = this.state.addedCompletions
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
        addCompletions: this.state.completions.filter((c) => preSyncAddedCompletions.includes(normalizeCompletionName(c.name))),
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
      this.info('SYNC', 'initial sync!')
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

      const serverShoppingList: ShoppingList = _.omit(serverSyncedShoppingList, 'token', 'changeId')

      // get new shopping list and determine if there were further local changes while syncing
      let dirtyAfterSync, newShoppingList
      if (preSyncShoppingList != null) {
        const clientShoppingList = this.getShoppingList(this.state)
        dirtyAfterSync = !_.isEqual(preSyncShoppingList, clientShoppingList)
        newShoppingList = mergeShoppingLists(preSyncShoppingList, clientShoppingList, serverShoppingList, serverCategories)
      } else {
        newShoppingList = serverShoppingList
        dirtyAfterSync = false
      }

      // retain completion deletions performed during sync
      const unsyncedDeletedCompletions = this.state.deletedCompletions.filter(
        (name) => !preSyncDeletedCompletions.includes(normalizeCompletionName(name))
      )
      dirtyAfterSync = dirtyAfterSync || unsyncedDeletedCompletions.length > 0 // add newly fetched changes to local changes

      // retain completion deletions performed during sync
      const unsyncedAddedCompletions = this.state.addedCompletions.filter(
        (name) => !preSyncAddedCompletions.includes(normalizeCompletionName(name))
      )
      dirtyAfterSync = dirtyAfterSync || unsyncedAddedCompletions.length > 0 // add newly fetched changes to local changes

      // apply new categories only if no client-side changes
      let categories, categoriesChanged
      if (_.isEqual(preSyncCategories, this.state.categories)) {
        categories = serverCategories
        categoriesChanged = false
      } else {
        categories = this.state.categories
        categoriesChanged = !_.isEqual(categories, serverCategories)
        dirtyAfterSync = dirtyAfterSync || categoriesChanged
      }

      // apply new orders only if no client-side changes
      let orders, ordersChanged
      if (_.isEqual(preSyncOrders, this.state.orders)) {
        orders = serverOrders
        ordersChanged = false
      } else {
        orders = this.state.orders
        ordersChanged = !_.isEqual(orders, serverOrders)
        dirtyAfterSync = dirtyAfterSync || ordersChanged
      }

      // merge changes
      let changes
      if (newServerChanges.length === 0) {
        // no new changes, keep the old ones
        changes = this.state.changes
      } else if (this.state.changes.length !== 0 && _.first(newServerChanges)?.id === _.last(this.state.changes)?.id) {
        // the new changes connect to the local ones (latest of the old is oldest of the new), append
        changes = getOnlyNewChanges([...this.state.changes, ...newServerChanges.slice(1)])
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
        dirty: dirtyAfterSync,
        deletedCompletions: unsyncedDeletedCompletions,
        addedCompletions: unsyncedAddedCompletions,
        unsyncedChanges: this.state.unsyncedChanges.slice(preSyncUnsyncedChangesLength),
        syncing: false,
        loaded: true,
        lastSyncFailed: false,
        categoriesChanged,
        ordersChanged,
        previousSync: serverSyncedShoppingList,
        ...newShoppingList,
      }
      this.info('SYNC', 'deletedCompletions', syncState.deletedCompletions)
      this.info('SYNC', 'done syncing')

      this.setState(syncState)

      if (dirtyAfterSync) {
        this.info('SYNC', 'dirty after sync, resyncing')
        this.requestSync(0)
      }

      if (initialSync) {
        this.markListAsUsed()
      }
    } catch (e) {
      const failedState = {
        lastSyncFailed: true,
        syncing: false,
      }
      this.setState(failedState)
      this.info('SYNC', 'done syncing, failed', e)
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
    let recentlyUsedLists = this.db.get<readonly RecentlyUsedList[]>(RECENTLY_USED_KEY) ?? []

    let listUsed = recentlyUsedLists.find((ru) => ru.id === this.listid) ?? {
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

    recentlyUsedLists = updateInArray(recentlyUsedLists, listUsed, true)

    this.db.set(RECENTLY_USED_KEY, recentlyUsedLists)
  }

  createCompletionsStateUpdate(state: ClientShoppingList, updatedItem: Item): CompletionStateUpdate {
    const completionItem = createCompletionItem(_.pick(updatedItem, 'name', 'category'))
    const completionName = normalizeCompletionName(completionItem.name)

    const completions = this.getCompletionsWithAdded(state.completions, completionItem)
    return {
      completions,
      deletedCompletions: state.deletedCompletions.filter((name) => normalizeCompletionName(name) !== completionName),
    }
  }

  private getCompletionsWithAdded(completions: readonly CompletionItem[], completionItem: CompletionItem) {
    const completionName = normalizeCompletionName(completionItem.name)

    if (completionName.length === 0) {
      return completions
    }

    const entryIdx = _.findIndex(completions, (i) => normalizeCompletionName(i.name) === completionName)

    const newCompletions = [...completions]

    if (entryIdx === -1) {
      newCompletions.push(completionItem)
    } else {
      newCompletions.splice(entryIdx, 1, completionItem)
    }
    return newCompletions
  }

  applyDiff(diff: Diff): void {
    this.markListAsUsed()
    try {
      const localChange: Change = {
        id: createRandomUUID(),
        username: this.state.username,
        date: new Date(),
        diffs: [diff],
      }
      const newList = applyDiff(this.getShoppingList(this.state), diff)

      let completionStateUpdate: CompletionStateUpdate = {}
      if ('item' in diff && diff.item != null) {
        completionStateUpdate = this.createCompletionsStateUpdate(this.state, diff.item)
      }

      this.setState({
        ...newList,
        unsyncedChanges: [...this.state.unsyncedChanges, localChange],
        ...completionStateUpdate,
        dirty: true,
      })
    } catch (e) {
      this.log('error', 'SYNC', 'Error while applying diff', diff, e)
    }
    this.requestSync()
  }

  createApplicableDiff(diff: Diff): Diff | null {
    return createApplicableDiff(this.getShoppingList(this.state), diff)
  }

  deleteCompletion(completionName: string): void {
    const normalizedCompletionName = normalizeCompletionName(completionName)
    this.setState({
      deletedCompletions: [...this.state.deletedCompletions, normalizedCompletionName],
      addedCompletions: this.state.addedCompletions.filter((c) => c !== normalizedCompletionName),
      completions: this.state.completions.filter(
        (completion) => normalizeCompletionName(completion.name) !== normalizedCompletionName
      ),
      dirty: true,
    })
    this.requestSync()
  }

  addCompletion(completion: CompletionItem): void {
    const normalizedCompletionName = normalizeCompletionName(completion.name)
    this.setState({
      deletedCompletions: this.state.deletedCompletions.filter((c) => c !== normalizedCompletionName),
      addedCompletions: [...this.state.addedCompletions, normalizedCompletionName],
      completions: this.getCompletionsWithAdded(this.state.completions, completion),

      dirty: true,
    })
    this.requestSync()
  }

  updateListTitle(newTitle: string): void {
    this.markListAsUsed()
    this.setState({
      title: newTitle,
      dirty: true,
    })
    this.requestSync()
  }

  createItem(localItem: LocalItem): void {
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

  deleteItem(id: UUID): void {
    try {
      const diff = generateDeleteItem(this.getShoppingList(this.state), id)
      this.applyDiff(diff)
    } catch (e) {
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  updateItem(id: UUID, localItem: LocalItem): void {
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

  selectOrder(id?: UUID | null): void {
    this.setState({
      selectedOrder: id,
    })
  }

  updateCategories(categories: readonly CategoryDefinition[]): void {
    this.markListAsUsed()
    this.setState({
      dirty: true,
      categoriesChanged: true,
      categories: categories,
    })
    this.requestSync()
  }

  updateOrders(orders: readonly Order[]): void {
    this.markListAsUsed()
    this.setState({
      dirty: true,
      ordersChanged: true,
      orders: orders,
    })
    this.requestSync()
  }

  setUsername(username?: string | null): void {
    if (username != null) {
      username = username.trim()

      if (username === '') {
        username = null
      }
    }

    this.setState({
      username,
      unsyncedChanges: this.state.unsyncedChanges.map((c) => ({ ...c, username })),
    })
  }

  requestSync(delay = 1000): void {
    window.clearTimeout(this.requestSyncTimeoutID)
    this.requestSyncTimeoutID = window.setTimeout(() => {
      this.sync()
    }, delay)
  }

  info(...messages: unknown[]) {
    this.log('info', ...messages)
  }

  log(method: keyof typeof console, ...messages: unknown[]) {
    console[method](`[SyncingCore listid="${this.listid}"]`, ...messages)
  }

  handleListChange = ({ list: { id } }: { list: PersistedClientShoppingList }): void => {
    if (id === this.listid) {
      this.load()
    }
  }

  handleOnline = (): void => {
    this.initiateSyncConnection()
  }

  handleOffline = (): void => {
    this.info('offline')
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
