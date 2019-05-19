// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type UUID, createUUID } from '../util/uuid'
import { type Item } from './Item'
import { type ShoppingList, createShoppingList } from './ShoppingList'
import { type CategoryDefinition } from './CategoryDefinition'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'


export type SyncedShoppingList = {
  +id: string,
  +title: string,
  +token: string,
  +changeId: ?UUID,
  +items: $ReadOnlyArray<Item>,
  [any]: empty
}

export type SyncRequest = {
  +previousSync: SyncedShoppingList,
  +currentState: ShoppingList,
  [any]: empty
}

export function createSyncedShoppingList(syncedShoppingListSpec: any, categories: ?$ReadOnlyArray<CategoryDefinition>): SyncedShoppingList {
  const shoppingList = createShoppingList(_.omit(syncedShoppingListSpec, ['token', 'changeId']), categories)
  checkAttributeType(syncedShoppingListSpec, 'token', 'string')
  checkAttributeType(syncedShoppingListSpec, 'changeId', 'string', true)

  const syncedShoppingList = {}
  Object.assign(syncedShoppingList, shoppingList)
  syncedShoppingList.token = syncedShoppingListSpec.token
  syncedShoppingList.changeId = nullSafe(createUUID)(syncedShoppingListSpec.changeId)

  return deepFreeze(syncedShoppingList)
}

export function createSyncRequest(syncRequestSpec: any): SyncRequest {
  checkKeys(syncRequestSpec, ['previousSync', 'currentState'])
  checkAttributeType(syncRequestSpec, 'previousSync', 'object')
  checkAttributeType(syncRequestSpec, 'currentState', 'object')

  const syncRequest = {}
  try {
    syncRequest.previousSync = createSyncedShoppingList(syncRequestSpec.previousSync, null)
  } catch (e) {
    throw new TypeError(`Error in previousSync: ${e.message}`)
  }
  try {
    syncRequest.currentState = createShoppingList(syncRequestSpec.currentState, null)
  } catch (e) {
    throw new TypeError(`Error in previousSync: ${e.message}`)
  }

  return deepFreeze(syncRequest)
}
