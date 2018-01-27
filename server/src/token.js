// @flow
import _ from 'lodash'
import stringify from 'json-stable-stringify'
import crypto from 'crypto'
import { type BaseShoppingList, type SyncedShoppingList, createShoppingList, createSyncedShoppingList } from 'shoppinglist-shared'

const secret = "123" // TODO import from config!

export function setToken(list: BaseShoppingList): SyncedShoppingList {
  return createSyncedShoppingList({...list, token: createToken(list)})
}

export function createToken(list: BaseShoppingList): string {
  const secretList = createSyncedShoppingList({...list, token: secret})
  const secretListJSON = stringify(secretList)
  return crypto.createHash('sha256').update(secretListJSON).digest('hex')
}

export function validateToken(list: SyncedShoppingList): boolean {
  return list.token === setToken(list).token
}
