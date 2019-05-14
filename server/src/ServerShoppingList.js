// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import {
  type Item, type ShoppingList, type CompletionItem, type CategoryDefinition, type Order, type Change,
  createShoppingList, checkKeys, checkAttributeType, createCompletionItem, createCategoryDefinition, createOrder, createChange
} from 'shoppinglist-shared'

export type RecentlyUsed = {lastUsedTimestamp: number, uses: number, item: CompletionItem}
export type RecentlyUsedArray = $ReadOnlyArray<RecentlyUsed>

export type ServerShoppingList = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>,
  +recentlyUsed: RecentlyUsedArray,
  +categories: $ReadOnlyArray<CategoryDefinition>,
  +orders: $ReadOnlyArray<Order>,
  +changes: $ReadOnlyArray<Change>,
}

export function createServerShoppingList(serverShoppingListSpec: any): ServerShoppingList {
  checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array')
  checkAttributeType(serverShoppingListSpec, 'categories', 'array')
  checkAttributeType(serverShoppingListSpec, 'orders', 'array')
  checkAttributeType(serverShoppingListSpec, 'changes', 'array')

  const recentlyUsed = serverShoppingListSpec.recentlyUsed.map(used => {
    checkKeys(used, ['lastUsedTimestamp', 'uses', 'item'])
    checkAttributeType(used, 'lastUsedTimestamp', 'number')
    checkAttributeType(used, 'uses', 'number')
    checkAttributeType(used, 'item', 'object')

    return {...used, item: createCompletionItem(used.item)}
  })
  const categories = serverShoppingListSpec.categories.map(createCategoryDefinition)
  const orders = serverShoppingListSpec.orders.map(createOrder)
  const changes = serverShoppingListSpec.changes.map(createChange)

  const shoppingList = createShoppingList(_.omit(serverShoppingListSpec, ['recentlyUsed', 'categories', 'orders', 'changes']), categories)

  const serverShoppingList = {}
  Object.assign(serverShoppingList, shoppingList)
  serverShoppingList.recentlyUsed = recentlyUsed
  serverShoppingList.categories = categories
  serverShoppingList.orders = orders
  serverShoppingList.changes = changes

  return deepFreeze(serverShoppingList)
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']), serverShoppingList.categories)
}
