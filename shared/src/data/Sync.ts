import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, errorMap, nullSafe } from '../util/validation'
import { CategoryDefinition, createCategoryDefinition } from './CategoryDefinition'
import { Change, createChange } from './Change'
import { CompletionItem, createCompletionItem, Item } from './Item'
import { createOrder, Order } from './Order'
import { createShoppingList, ShoppingList } from './ShoppingList'

export interface SyncedShoppingList {
  readonly id: string
  readonly title: string
  readonly token: string
  readonly changeId: UUID | undefined | null
  readonly items: ReadonlyArray<Item>
}

export interface SyncRequest {
  readonly previousSync: SyncedShoppingList
  readonly currentState: ShoppingList
  readonly includeInResponse?: ReadonlyArray<string>
  readonly categories?: ReadonlyArray<CategoryDefinition>
  readonly orders?: ReadonlyArray<Order>
  readonly deleteCompletions?: ReadonlyArray<string>
}

export interface SyncResponse {
  readonly list: SyncedShoppingList
  readonly completions?: ReadonlyArray<CompletionItem>
  readonly categories?: ReadonlyArray<CategoryDefinition>
  readonly orders?: ReadonlyArray<Order>
  readonly changes?: ReadonlyArray<Change>
}

export function createSyncedShoppingList(
  syncedShoppingListSpec: any,
  categories?: ReadonlyArray<CategoryDefinition> | null
): SyncedShoppingList {
  const shoppingList = createShoppingList(_.omit(syncedShoppingListSpec, ['token', 'changeId']), categories)
  checkAttributeType(syncedShoppingListSpec, 'token', 'string')
  checkAttributeType(syncedShoppingListSpec, 'changeId', 'string', true)

  const syncedShoppingList = {
    ...shoppingList,
    token: syncedShoppingListSpec.token,
    changeId: nullSafe(createUUID)(syncedShoppingListSpec.changeId),
  }

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

  let previousSync: SyncedShoppingList
  try {
    previousSync = createSyncedShoppingList(syncRequestSpec.previousSync, null)
  } catch (e) {
    throw new TypeError(`Error in previousSync: ${e.message}`)
  }

  let currentState: ShoppingList
  try {
    currentState = createShoppingList(syncRequestSpec.currentState, null)
  } catch (e) {
    throw new TypeError(`Error in currentState: ${e.message}`)
  }

  let includeInResponse: ReadonlyArray<string> | undefined = undefined
  if (syncRequestSpec.includeInResponse != null) {
    includeInResponse = syncRequestSpec.includeInResponse
  }

  let categories: ReadonlyArray<CategoryDefinition> | undefined = undefined
  if (syncRequestSpec.categories != null) {
    try {
      categories = errorMap(syncRequestSpec.categories, createCategoryDefinition)
    } catch (e) {
      throw new TypeError(`Error in categories: ${e.message}`)
    }
  }

  let orders: ReadonlyArray<Order> | undefined = undefined
  if (syncRequestSpec.orders != null) {
    try {
      orders = errorMap(syncRequestSpec.orders, createOrder)
    } catch (e) {
      throw new TypeError(`Error in orders: ${e.message}`)
    }
  }

  let deleteCompletions: ReadonlyArray<string> | undefined = undefined
  if (syncRequestSpec.deleteCompletions != null) {
    try {
      deleteCompletions = errorMap(syncRequestSpec.deleteCompletions, (c) => {
        if (typeof c !== 'string') {
          throw TypeError('Completion name must be string!')
        }

        return c
      })
    } catch (e) {
      throw new TypeError(`Error in deleteCompletions: ${e.message}`)
    }
  }

  return {
    previousSync,
    currentState,
    includeInResponse,
    categories,
    orders,
    deleteCompletions,
  }
}

export function createSyncResponse(syncResponseSpec: any): SyncResponse {
  checkKeys(syncResponseSpec, ['list', 'completions', 'categories', 'orders', 'changes'])
  checkAttributeType(syncResponseSpec, 'list', 'object')
  checkAttributeType(syncResponseSpec, 'completions', 'array', true)
  checkAttributeType(syncResponseSpec, 'categories', 'array', true)
  checkAttributeType(syncResponseSpec, 'orders', 'array', true)
  checkAttributeType(syncResponseSpec, 'changes', 'array', true)

  let list: SyncedShoppingList
  try {
    list = createSyncedShoppingList(syncResponseSpec.list, null)
  } catch (e) {
    throw new TypeError(`Error in list: ${e.message}`)
  }

  let completions: ReadonlyArray<CompletionItem> | undefined = undefined
  if (syncResponseSpec.completions != null) {
    try {
      completions = errorMap(syncResponseSpec.completions, createCompletionItem)
    } catch (e) {
      throw new TypeError(`Error in completions: ${e.message}`)
    }
  }

  let categories: ReadonlyArray<CategoryDefinition> | undefined = undefined
  if (syncResponseSpec.categories != null) {
    try {
      categories = errorMap(syncResponseSpec.categories, createCategoryDefinition)
    } catch (e) {
      throw new TypeError(`Error in categories: ${e.message}`)
    }
  }

  let orders: ReadonlyArray<Order> | undefined = undefined
  if (syncResponseSpec.orders != null) {
    try {
      orders = errorMap(syncResponseSpec.orders, createOrder)
    } catch (e) {
      throw new TypeError(`Error in orders: ${e.message}`)
    }
  }

  let changes: ReadonlyArray<Change> | undefined = undefined
  if (syncResponseSpec.changes != null) {
    try {
      changes = errorMap(syncResponseSpec.changes, createChange)
    } catch (e) {
      throw new TypeError(`Error in changes: ${e.message}`)
    }
  }

  return {
    list,
    completions,
    categories,
    orders,
    changes,
  }
}
