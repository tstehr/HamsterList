import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import assertError from '../util/assertError.js'
import { createUUID, UUID } from '../util/uuid.js'
import {
  checkAttributeType,
  checkKeys,
  endValidation,
  errorMap,
  getLiteralKeys,
  isIndexable,
  nullSafe,
} from '../util/validation.js'
import { CategoryDefinition, createCategoryDefinition } from './CategoryDefinition.js'
import { Change, createChange } from './Change.js'
import { CompletionItem, createCompletionItem, Item } from './Item.js'
import { createOrder, Order } from './Order.js'
import { createShoppingList, ShoppingList } from './ShoppingList.js'

export interface SyncedShoppingList {
  readonly id: string
  readonly title: string
  readonly token: string
  readonly changeId: UUID | undefined | null
  readonly items: readonly Item[]
}

export interface SyncRequest {
  readonly previousSync: SyncedShoppingList
  readonly currentState: ShoppingList
  readonly includeInResponse?: readonly string[]
  readonly categories?: readonly CategoryDefinition[]
  readonly orders?: readonly Order[]
  readonly deleteCompletions?: readonly string[]
  readonly addCompletions?: readonly CompletionItem[]
}

export interface SyncResponse {
  readonly list: SyncedShoppingList
  readonly completions?: readonly CompletionItem[]
  readonly categories?: readonly CategoryDefinition[]
  readonly orders?: readonly Order[]
  readonly changes?: readonly Change[]
}

export function createSyncedShoppingList(
  syncedShoppingListSpec: unknown,
  categories?: readonly CategoryDefinition[] | null,
): SyncedShoppingList {
  if (isIndexable(syncedShoppingListSpec)) {
    const shoppingList = createShoppingList(_.omit(syncedShoppingListSpec, ['token', 'changeId']), categories)
    if (
      checkKeys(syncedShoppingListSpec, [...getLiteralKeys(shoppingList), 'token', 'changeId']) &&
      checkAttributeType(syncedShoppingListSpec, 'token', 'string') &&
      checkAttributeType(syncedShoppingListSpec, 'changeId', 'string', true)
    ) {
      const syncedShoppingList = {
        ...shoppingList,
        token: syncedShoppingListSpec.token,
        changeId: nullSafe(createUUID)(syncedShoppingListSpec.changeId),
      }

      return deepFreeze(syncedShoppingList)
    }
  }
  endValidation()
}

export function createSyncRequest(syncRequestSpec: unknown, transformItemSpec?: (itemSpec: unknown) => unknown): SyncRequest {
  if (
    checkKeys(syncRequestSpec, [
      'previousSync',
      'currentState',
      'includeInResponse',
      'categories',
      'orders',
      'deleteCompletions',
      'addCompletions',
    ]) &&
    checkAttributeType(syncRequestSpec, 'previousSync', 'object') &&
    checkAttributeType(syncRequestSpec, 'currentState', 'object') &&
    checkAttributeType(syncRequestSpec, 'includeInResponse', 'array', true) &&
    checkAttributeType(syncRequestSpec, 'categories', 'array', true) &&
    checkAttributeType(syncRequestSpec, 'orders', 'array', true) &&
    checkAttributeType(syncRequestSpec, 'deleteCompletions', 'array', true) &&
    checkAttributeType(syncRequestSpec, 'addCompletions', 'array', true)
  ) {
    let previousSync: SyncedShoppingList
    try {
      previousSync = createSyncedShoppingList(syncRequestSpec.previousSync, null)
    } catch (e) {
      assertError(e)
      throw new TypeError(`Error in previousSync: ${e.message}`)
    }

    let currentState: ShoppingList
    try {
      currentState = createShoppingList(syncRequestSpec.currentState, null, transformItemSpec)
    } catch (e) {
      assertError(e)
      throw new TypeError(`Error in currentState: ${e.message}`)
    }

    let includeInResponse: readonly string[] | undefined = undefined
    if (syncRequestSpec.includeInResponse != null) {
      includeInResponse = errorMap(syncRequestSpec.includeInResponse, (s) => {
        if (typeof s !== 'string') {
          throw TypeError('Element of includeInResponse must be of type "string"!')
        }
        return s
      })
    }

    let categories: readonly CategoryDefinition[] | undefined = undefined
    if (syncRequestSpec.categories != null) {
      try {
        categories = errorMap(syncRequestSpec.categories, createCategoryDefinition)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in categories: ${e.message}`)
      }
    }

    let orders: readonly Order[] | undefined = undefined
    if (syncRequestSpec.orders != null) {
      try {
        orders = errorMap(syncRequestSpec.orders, createOrder)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in orders: ${e.message}`)
      }
    }

    let deleteCompletions: readonly string[] | undefined = undefined
    if (syncRequestSpec.deleteCompletions != null) {
      try {
        deleteCompletions = errorMap(syncRequestSpec.deleteCompletions, (c) => {
          if (typeof c !== 'string') {
            throw TypeError('Completion name must be string!')
          }

          return c
        })
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in deleteCompletions: ${e.message}`)
      }
    }

    let addCompletions: readonly CompletionItem[] | undefined = undefined
    if (syncRequestSpec.addCompletions != null) {
      try {
        addCompletions = errorMap(syncRequestSpec.addCompletions, createCompletionItem)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in addCompletions: ${e.message}`)
      }
    }

    return {
      previousSync,
      currentState,
      includeInResponse,
      categories,
      orders,
      deleteCompletions,
      addCompletions,
    }
  }
  endValidation()
}

export function createSyncResponse(syncResponseSpec: unknown): SyncResponse {
  if (
    checkKeys(syncResponseSpec, ['list', 'completions', 'categories', 'orders', 'changes']) &&
    checkAttributeType(syncResponseSpec, 'list', 'object') &&
    checkAttributeType(syncResponseSpec, 'completions', 'array', true) &&
    checkAttributeType(syncResponseSpec, 'categories', 'array', true) &&
    checkAttributeType(syncResponseSpec, 'orders', 'array', true) &&
    checkAttributeType(syncResponseSpec, 'changes', 'array', true)
  ) {
    let list: SyncedShoppingList
    try {
      list = createSyncedShoppingList(syncResponseSpec.list, null)
    } catch (e) {
      assertError(e)
      throw new TypeError(`Error in list: ${e.message}`)
    }

    let completions: readonly CompletionItem[] | undefined = undefined
    if (syncResponseSpec.completions != null) {
      try {
        completions = errorMap(syncResponseSpec.completions, createCompletionItem)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in completions: ${e.message}`)
      }
    }

    let categories: readonly CategoryDefinition[] | undefined = undefined
    if (syncResponseSpec.categories != null) {
      try {
        categories = errorMap(syncResponseSpec.categories, createCategoryDefinition)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in categories: ${e.message}`)
      }
    }

    let orders: readonly Order[] | undefined = undefined
    if (syncResponseSpec.orders != null) {
      try {
        orders = errorMap(syncResponseSpec.orders, createOrder)
      } catch (e) {
        assertError(e)
        throw new TypeError(`Error in orders: ${e.message}`)
      }
    }

    let changes: readonly Change[] | undefined = undefined
    if (syncResponseSpec.changes != null) {
      try {
        changes = errorMap(syncResponseSpec.changes, createChange)
      } catch (e) {
        assertError(e)
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
  endValidation()
}
