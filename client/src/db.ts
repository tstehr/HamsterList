import Emittery from 'emittery'
import _ from 'lodash'
import { frecency } from 'shoppinglist-shared'
import { PersistedClientShoppingList } from 'sync'

// in case of incompatible changes we increment the number to ensure that old data isn't read by new version
const keyPrefix = 'SL$$1$$'
const listPrefix = `${keyPrefix}LIST$$`

export type Key =
  | {
      readonly type: 'simple'
      readonly identifier: string
    }
  | {
      readonly type: 'list'
      readonly listid: string
    }

type Value = any

export const RECENTLY_USED_KEY: Key = { type: 'simple', identifier: 'recentlyUsedLists' }
export const RESTORATION_ENABLED: Key = { type: 'simple', identifier: 'restorationEnabled' }
export const RESTORATION_PATH: Key = { type: 'simple', identifier: 'restorationPath' }

@Emittery.mixin('emitter')
class DB {
  constructor() {
    this.migrateRecentlyUsedLists()
    window.addEventListener('storage', this.handleStorage)
  }

  public close() {
    window.removeEventListener('storage', this.handleStorage)
  }

  public getList(listid: string) {
    return this.get<PersistedClientShoppingList>({ type: 'list', listid })
  }

  public updateList(list: PersistedClientShoppingList) {
    return this.set({ type: 'list', listid: list.id }, list)
  }

  public removeList(listid: string) {
    return this.remove({ type: 'list', listid })
  }

  public get<T = Value>(key: Key): T | null {
    const keyString = this.mangleKey(key)
    const itemString = localStorage.getItem(keyString)
    if (itemString === null) {
      return null
    }

    try {
      return JSON.parse(itemString)
    } catch (e) {
      if (e instanceof SyntaxError) {
        return null
      }
      throw e
    }
  }

  public set(key: Key, item: Value) {
    const keyString = this.mangleKey(key)
    const itemString = JSON.stringify(item)
    localStorage.setItem(keyString, itemString)
  }

  public remove(key: Key) {
    const keyString = this.mangleKey(key)
    localStorage.removeItem(keyString)
  }

  private handleStorage = (e: StorageEvent) => {
    if (e.key === null) {
      console.log('DB', 'local storage clear')
      return
    }
    const key = this.unmangleKey(e.key)
    if (key) {
      this.emitter.emit('change', { key, value: this.get(key) })
      if (key.type === 'list') {
        const list = this.getList(key.listid)
        if (list) {
          this.emitter.emit('listChange', { list })
        }
      }
    }
  }

  private mangleKey(key: Key): string {
    switch (key.type) {
      case 'simple':
        return `${keyPrefix}${key.identifier}`
      case 'list':
        return `${listPrefix}${key.listid}`
    }
  }

  private unmangleKey(keyString: string): Key | null {
    if (keyString.startsWith(listPrefix)) {
      const listid = keyString.slice(listPrefix.length)
      return listid ? { type: 'list', listid } : null
    }
    if (keyString.startsWith(keyPrefix)) {
      const identifier = keyString.slice(keyPrefix.length)
      return identifier ? { type: 'simple', identifier } : null
    }
    return null
  }

  private migrateRecentlyUsedLists() {
    try {
      if (this.get(RECENTLY_USED_KEY) === null) {
        const oldDB = JSON.parse(localStorage['db'])
        const oldRecentlyUsedLists = oldDB?.recentlyUsedLists
        if (oldRecentlyUsedLists) {
          this.set(RECENTLY_USED_KEY, oldRecentlyUsedLists)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}

type DBEmitter = Emittery.Typed<{
  change: { key: Key; value: Value }
  listChange: { list: PersistedClientShoppingList }
}>

interface DB extends Omit<DBEmitter, 'emit' | 'emitSerial'> {
  emitter: DBEmitter
}

export default DB

export interface RecentlyUsedList {
  id: string
  uses: number
  lastUsedTimestamp: number
  title?: string
}

export function getRecentlyUsedLists(db: DB): readonly RecentlyUsedList[] {
  return _.chain(db.get(RECENTLY_USED_KEY) ?? [])
    .orderBy([(entry: RecentlyUsedList) => frecency(entry)], ['desc'])
    .value()
}
