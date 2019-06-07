// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type UUID, createUUID } from '../util/uuid'
import { type Item, type CompletionItem, createCompletionItem } from './Item'
import { type ShoppingList, createShoppingList } from './ShoppingList'
import { type CategoryDefinition, createCategoryDefinition } from './CategoryDefinition'
import { type Order, createOrder } from './Order'
import { type Change, createChange } from './Change'
import { checkKeys, checkAttributeType, nullSafe, errorMap } from '../util/validation'


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
  +includeInResponse?: string[],
  [any]: empty
}

export type SyncResponse = {
  list: SyncedShoppingList,
  completions?: $ReadOnlyArray<CompletionItem>,
  categories?: $ReadOnlyArray<CategoryDefinition>, 
  orders?: $ReadOnlyArray<Order>,
  changes?: $ReadOnlyArray<Change>,
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
  checkKeys(syncRequestSpec, ['previousSync', 'currentState', 'includeInResponse'])
  checkAttributeType(syncRequestSpec, 'previousSync', 'object')
  checkAttributeType(syncRequestSpec, 'currentState', 'object')
  checkAttributeType(syncRequestSpec, 'includeInResponse', 'array', true)

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
  if (syncRequestSpec.includeInResponse != null) {
    syncRequest.includeInResponse = syncRequestSpec.includeInResponse
  }

  return deepFreeze(syncRequest)
}

export function createSyncResponse(syncResponseSpec: any): SyncResponse {
  checkKeys(syncResponseSpec, ['list', 'completions', 'categories', 'orders', 'changes'])
  checkAttributeType(syncResponseSpec, 'list', 'object')
  checkAttributeType(syncResponseSpec, 'completions', 'array', true)
  checkAttributeType(syncResponseSpec, 'categories', 'array', true)
  checkAttributeType(syncResponseSpec, 'orders', 'array', true)
  checkAttributeType(syncResponseSpec, 'changes', 'array', true)

  const syncResponse: SyncResponse = {}
  try {
    syncResponse.list = createSyncedShoppingList(syncResponseSpec.list, null)
  } catch (e) {
    throw new TypeError(`Error in list: ${e.message}`)
  }


  if (syncResponseSpec.completions != null) {
    try {
      syncResponse.completions = errorMap(syncResponseSpec.completions, createCompletionItem)
    } catch (e) {
      throw new TypeError(`Error in completions: ${e.message}`)
    }
  }

  if (syncResponseSpec.categories != null) {
    try {
      syncResponse.categories = errorMap(syncResponseSpec.categories, createCategoryDefinition)
    } catch (e) {
      throw new TypeError(`Error in categories: ${e.message}`)
    }
  }
  
  if (syncResponseSpec.orders != null) {
    try {
      syncResponse.orders = errorMap(syncResponseSpec.orders, createOrder)
    } catch (e) {
      throw new TypeError(`Error in orders: ${e.message}`)
    }
  }


  if (syncResponseSpec.changes != null) {
    try {
      syncResponse.changes = errorMap(syncResponseSpec.changes, createChange)
    } catch (e) {
      throw new TypeError(`Error in changes: ${e.message}`)
    }
  }

  return deepFreeze(syncResponse)
}

