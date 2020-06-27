import Emittery from 'emittery'
import _ from 'lodash'
import { frecency } from 'shoppinglist-shared'
import { PersistedClientShoppingList } from 'sync'
import { MixinEmitter } from 'utils'

export type Key =
  | {
      readonly type: 'simple'
      readonly identifier: string
    }
  | {
      readonly type: 'list'
      readonly listid: string
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Value = any

export const RECENTLY_USED_KEY: Key = { type: 'simple', identifier: 'recentlyUsedLists' }
export const RESTORATION_ENABLED: Key = { type: 'simple', identifier: 'restorationEnabled' }
export const RESTORATION_PATH: Key = { type: 'simple', identifier: 'restorationPath' }

export type DBEmitter = Emittery.Typed<{
  change: { key: Key; value: Value }
  listChange: { list: PersistedClientShoppingList }
}>

type DB = {
  close(): void
  get<T = Value>(key: Key): T | null
  set(key: Key, item: Value): void
  remove(key: Key): void
  getList(listid: string): PersistedClientShoppingList | null
  updateList(list: PersistedClientShoppingList): void
  removeList(listid: string): void
} & MixinEmitter<DBEmitter>

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

export default DB
