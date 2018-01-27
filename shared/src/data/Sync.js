// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type Item } from './Item'
import { type ShoppingList, createShoppingList } from './ShoppingList'
import { checkKeys, checkAttributeType } from '../util/validation'


export type SyncedShoppingList = {
  +id: string,
  +title: string,
  +token: string,
  +items: $ReadOnlyArray<Item>,
  [any]: empty
}

export type SyncRequest = {
  +previousSync: SyncedShoppingList,
  +currentState: ShoppingList,
  [any]: empty
}

export function createSyncedShoppingList(syncedShoppingListSpec: any): SyncedShoppingList {
  const shoppingList = createShoppingList(_.omit(syncedShoppingListSpec, ['token']))
  checkAttributeType(syncedShoppingListSpec, 'token', 'string')

  const syncedShoppingList = {}
  Object.assign(syncedShoppingList, shoppingList)
  syncedShoppingList.token = syncedShoppingListSpec.token

  return deepFreeze(syncedShoppingList)
}

export function createSyncRequest(syncRequestSpec: any): SyncRequest {
  checkKeys(syncRequestSpec, ['previousSync', 'currentState'])
  checkAttributeType(syncRequestSpec, 'previousSync', 'object')
  checkAttributeType(syncRequestSpec, 'currentState', 'object')

  const syncRequest = {}
  syncRequest.previousSync = createSyncedShoppingList(syncRequestSpec.previousSync)
  syncRequest.currentState = createShoppingList(syncRequestSpec.currentState)

  return deepFreeze(syncRequest)
}
