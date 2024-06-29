import Emittery from 'emittery'
import { MixinEmitter } from 'utils'
import DB, { DBEmitter, Key, Value } from './DB'
import { PersistedClientShoppingList } from './sync'

// in case of incompatible changes we increment the number to ensure that old data isn't read by new version
const keyPrefix = 'SL$$1$$'
const listPrefix = `${keyPrefix}LIST$$`

@Emittery.mixin('emitter')
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class LocalStorageDB implements DB {
  constructor() {
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
      const item = JSON.parse(itemString) as T
      return item
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
      void this.emitter.emit('change', { key, value: this.get(key) })
      if (key.type === 'list') {
        const list = this.getList(key.listid)
        if (list) {
          void this.emitter.emit('listChange', { list })
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unsafe-declaration-merging
interface LocalStorageDB extends MixinEmitter<DBEmitter> {}

export default LocalStorageDB
