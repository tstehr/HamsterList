// @flow
import _ from 'lodash'
import low from 'lowdb'
import LocalStorage from 'lowdb/adapters/LocalStorage'
import lodashId from 'lodash-id'

export function createDB() {
  const adapter = new LocalStorage('db')
  const db = low(adapter)
  db._.mixin(lodashId)
  db.defaults({
    lists: [],
    recentlyUsedLists: []
  }).write()
  return db
}
