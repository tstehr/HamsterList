import { RecentlyUsedList } from 'ChooseListComponent'
import lodashId from 'lodash-id'
import low from 'lowdb'
import LocalStorage from 'lowdb/adapters/LocalStorage'
import { frecency } from 'shoppinglist-shared'
import { ClientShoppingList } from './sync'

// temporary workaround, because there are no types for lodash-id
export type DB = low.LowdbSync<DBContents>

export interface DBContents {
  lists: readonly ClientShoppingList[]
  recentlyUsedLists: readonly RecentlyUsedList[]
}

export function createDB(): DB {
  const adapter = new LocalStorage('db')
  const db: DB = low(adapter)

  db._.mixin(lodashId)

  db.defaults({
    lists: [],
    recentlyUsedLists: [],
  }).write()

  return db
}

export function getRecentlyUsedLists(db: DB): readonly RecentlyUsedList[] {
  return db
    .get('recentlyUsedLists')
    .orderBy([(entry: RecentlyUsedList) => frecency(entry)], ['desc'])
    .value()
}
