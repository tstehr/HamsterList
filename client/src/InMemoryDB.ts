import Emittery from 'emittery'
import { MixinEmitter } from 'utils'
import DB, { DBEmitter, Key, Value } from './DB'
import { PersistedClientShoppingList } from './sync'

@Emittery.mixin('emitter')
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class InMemoryDB implements DB {
  private simple: Record<string, Value> = {}
  private lists: Record<string, Value> = {}

  public close() {
    return
  }

  public getList(listid: string) {
    return (this.lists[listid] ?? null) as PersistedClientShoppingList | null
  }

  public updateList(list: PersistedClientShoppingList) {
    this.lists[list.id] = list
  }

  public removeList(listid: string) {
    delete this.lists[listid]
  }

  public get<T = Value>(key: Key): T | null {
    switch (key.type) {
      case 'simple':
        return this.simple[key.identifier] as T
      case 'list':
        return this.lists[key.listid] as T
    }
  }

  public set(key: Key, item: Value) {
    switch (key.type) {
      case 'simple':
        this.simple[key.identifier] = item
        return
      case 'list':
        this.lists[key.listid] = item
        return
    }
  }

  public remove(key: Key) {
    switch (key.type) {
      case 'simple':
        delete this.simple[key.identifier]
        return
      case 'list':
        delete this.lists[key.listid]
        return
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unsafe-declaration-merging
interface InMemoryDB extends MixinEmitter<DBEmitter> {}

export default InMemoryDB
