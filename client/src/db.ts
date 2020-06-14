import { RecentlyUsedList } from 'ChooseListComponent'
import Emittery from 'emittery'
import _ from 'lodash'
import { frecency } from 'shoppinglist-shared'
import { ClientShoppingList } from 'sync'

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

@Emittery.mixin('emitter')
class DB {
  constructor() {
    window.addEventListener('storage', this.handleStorage)
  }

  public close() {
    window.removeEventListener('storage', this.handleStorage)
  }

  public getList(listid: string) {
    return this.get<ClientShoppingList>({ type: 'list', listid })
  }

  public updateList(list: ClientShoppingList) {
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
}

type DBEmitter = Emittery.Typed<{
  change: { key: Key; value: Value }
  listChange: { list: ClientShoppingList }
}>

interface DB extends Omit<DBEmitter, 'emit' | 'emitSerial'> {
  emitter: DBEmitter
}

export default DB

export function getRecentlyUsedLists(db: DB): readonly RecentlyUsedList[] {
  return _.chain(db.get(RECENTLY_USED_KEY) ?? [])
    .orderBy([(entry: RecentlyUsedList) => frecency(entry)], ['desc'])
    .value()
}
