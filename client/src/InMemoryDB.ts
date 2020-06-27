import Emittery from 'emittery'
import { MixinEmitter } from 'utils'
import DB, { DBEmitter, Key, Value } from './DB'
import { PersistedClientShoppingList } from './sync'

@Emittery.mixin('emitter')
class InMemoryDB implements DB {
  private simple: { [k: string]: Value } = {}
  private lists: { [id: string]: Value } = {}

  public close() {
    return
  }

  public getList(listid: string) {
    return this.lists[listid]
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
        return this.simple[key.identifier]
      case 'list':
        return this.lists[key.listid]
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface InMemoryDB extends MixinEmitter<DBEmitter> {}

export default InMemoryDB
