// @flow
import _ from 'lodash'
import stringify from 'json-stable-stringify'
import crypto from 'crypto'
import { type BaseShoppingList, type SyncedShoppingList, type CategoryDefinition, createShoppingList, createSyncedShoppingList } from 'shoppinglist-shared'

const secret = "123" // TODO import from config!

export function setToken(list: BaseShoppingList, categories: $ReadOnlyArray<CategoryDefinition>): SyncedShoppingList {
  return createSyncedShoppingList({...list, token: createToken(list, categories)}, categories)
}

export function createToken(list: BaseShoppingList, categories: $ReadOnlyArray<CategoryDefinition>): string {
  const secretList = createSyncedShoppingList({...list, token: secret}, categories)
  const secretListJSON = stringify(secretList)
  return crypto.createHash('sha256').update(secretListJSON).digest('hex')
}

export function validateToken(list: SyncedShoppingList, categories: $ReadOnlyArray<CategoryDefinition>): boolean {
  return list.token === setToken(list, categories).token
}
