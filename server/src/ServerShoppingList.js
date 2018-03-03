// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import {
  type Item, type ShoppingList, type CompletionItem, type CategoryDefinition, type Order,
  createShoppingList, checkKeys, checkAttributeType, createCompletionItem, createCategoryDefinition, createOrder
} from 'shoppinglist-shared'

export type RecentlyUsed = {lastUsedTimestamp: number, uses: number, item: CompletionItem}
export type RecentlyUsedArray = $ReadOnlyArray<RecentlyUsed>

export type ServerShoppingList = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>,
  +recentlyUsed: RecentlyUsedArray,
  +categories: $ReadOnlyArray<CategoryDefinition>,
  +orders: $ReadOnlyArray<Order>
}

export function createServerShoppingList(serverShoppingListSpec: any): ServerShoppingList {
  checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array')
  checkAttributeType(serverShoppingListSpec, 'categories', 'array')
  checkAttributeType(serverShoppingListSpec, 'orders', 'array')

  const recentlyUsed = serverShoppingListSpec.recentlyUsed.map(used => {
    checkKeys(used, ['lastUsedTimestamp', 'uses', 'item'])
    checkAttributeType(used, 'lastUsedTimestamp', 'number')
    checkAttributeType(used, 'uses', 'number')
    checkAttributeType(used, 'item', 'object')

    return {...used, item: createCompletionItem(used.item)}
  })
  const categories = serverShoppingListSpec.categories.map(createCategoryDefinition)
  const orders = serverShoppingListSpec.orders.map(createOrder)

  const shoppingList = createShoppingList(_.omit(serverShoppingListSpec, ['recentlyUsed', 'categories', 'orders']), categories)

  const serverShoppingList = {}
  Object.assign(serverShoppingList, shoppingList)
  serverShoppingList.recentlyUsed = recentlyUsed
  serverShoppingList.categories = categories
  serverShoppingList.orders = orders

  return deepFreeze(serverShoppingList)
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']), serverShoppingList.categories)
}
