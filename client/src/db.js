// @flow
import low from 'lowdb'
import LocalStorage from 'lowdb/adapters/LocalStorage'
import lodashId from 'lodash-id'
import { frecency } from 'shoppinglist-shared'

export function createDB() {
  const adapter = new LocalStorage('db')
  const db = low(adapter)
  db._.mixin(lodashId)
  db.defaults({
    lists: [],
    recentlyUsedLists: [],
  }).write()
  return db
}

export function getRecentlyUsedLists(db: Object) {
  return db
    .get('recentlyUsedLists')
    .orderBy([(entry) => frecency(entry)], ['desc'])
    .value()
}
