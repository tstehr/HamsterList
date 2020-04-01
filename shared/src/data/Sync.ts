import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { createUUID } from '../util/uuid'
import { UUID } from '../util/uuid'
import { createCompletionItem } from './Item'
import { Item, CompletionItem } from './Item'
import { createShoppingList } from './ShoppingList'
import { ShoppingList } from './ShoppingList'
import { createCategoryDefinition } from './CategoryDefinition'
import { CategoryDefinition } from './CategoryDefinition'
import { createOrder } from './Order'
import { Order } from './Order'
import { createChange } from './Change'
import { Change } from './Change'
import { checkKeys, checkAttributeType, nullSafe, errorMap } from '../util/validation'
export type SyncedShoppingList = {
  readonly id: string
  readonly title: string
  readonly token: string
  readonly changeId: UUID | undefined | null
  readonly items: ReadonlyArray<Item>
  [x: any]: never
}
export type SyncRequest = {
  readonly previousSync: SyncedShoppingList
  readonly currentState: ShoppingList
  readonly includeInResponse?: string[]
  readonly categories?: ReadonlyArray<CategoryDefinition>
  readonly orders?: ReadonlyArray<Order>
  readonly deleteCompletions?: ReadonlyArray<string>
  [x: any]: never
}
export type SyncResponse = {
  list: SyncedShoppingList
  completions?: ReadonlyArray<CompletionItem>
  categories?: ReadonlyArray<CategoryDefinition>
  orders?: ReadonlyArray<Order>
  changes?: ReadonlyArray<Change>
}
export function createSyncedShoppingList(
  syncedShoppingListSpec: any,
  categories?: ReadonlyArray<CategoryDefinition> | null
): SyncedShoppingList {
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
  checkKeys(syncRequestSpec, ['previousSync', 'currentState', 'includeInResponse', 'categories', 'orders', 'deleteCompletions'])
  checkAttributeType(syncRequestSpec, 'previousSync', 'object')
  checkAttributeType(syncRequestSpec, 'currentState', 'object')
  checkAttributeType(syncRequestSpec, 'includeInResponse', 'array', true)
  checkAttributeType(syncRequestSpec, 'categories', 'array', true)
  checkAttributeType(syncRequestSpec, 'orders', 'array', true)
  checkAttributeType(syncRequestSpec, 'deleteCompletions', 'array', true)
  const syncRequest = {}

  try {
    syncRequest.previousSync = createSyncedShoppingList(syncRequestSpec.previousSync, null)
  } catch (e) {
    throw new TypeError(`Error in previousSync: ${e.message}`)
  }

  try {
    syncRequest.currentState = createShoppingList(syncRequestSpec.currentState, null)
  } catch (e) {
    throw new TypeError(`Error in currentState: ${e.message}`)
  }

  if (syncRequestSpec.includeInResponse != null) {
    syncRequest.includeInResponse = syncRequestSpec.includeInResponse
  }

  if (syncRequestSpec.categories != null) {
    try {
      syncRequest.categories = errorMap(syncRequestSpec.categories, createCategoryDefinition)
    } catch (e) {
      throw new TypeError(`Error in categories: ${e.message}`)
    }
  }

  if (syncRequestSpec.orders != null) {
    try {
      syncRequest.orders = errorMap(syncRequestSpec.orders, createOrder)
    } catch (e) {
      throw new TypeError(`Error in orders: ${e.message}`)
    }
  }

  if (syncRequestSpec.deleteCompletions != null) {
    try {
      syncRequest.deleteCompletions = errorMap(syncRequestSpec.deleteCompletions, (c) => {
        if (typeof c !== 'string') {
          throw TypeError('Completion name must be string!')
        }

        return c
      })
    } catch (e) {
      throw new TypeError(`Error in deleteCompletions: ${e.message}`)
    }
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
