// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type Item, type ShoppingList, type CompletionItem, type CategoryDefinition, createShoppingList, checkKeys, checkAttributeType, createCompletionItem, createCategoryDefinition } from 'shoppinglist-shared'

export type RecentlyUsedArray = $ReadOnlyArray<{lastUsedTimestamp: number, uses: number, item: CompletionItem}>

export type ServerShoppingList = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>,
  +recentlyUsed: RecentlyUsedArray,
  +categories: $ReadOnlyArray<CategoryDefinition>
}

export function createServerShoppingList(serverShoppingListSpec: any): ServerShoppingList {
  checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array')
  checkAttributeType(serverShoppingListSpec, 'categories', 'array')

  const categories = serverShoppingListSpec.categories.map(createCategoryDefinition)
  const recentlyUsed = serverShoppingListSpec.recentlyUsed.map(used => {
    checkKeys(used, ['lastUsedTimestamp', 'uses', 'item'])
    checkAttributeType(used, 'lastUsedTimestamp', 'number')
    checkAttributeType(used, 'uses', 'number')
    checkAttributeType(used, 'item', 'object')

    return {...used, item: createCompletionItem(used.item)}
  })

  const shoppingList = createShoppingList(_.omit(serverShoppingListSpec, ['recentlyUsed', 'categories']), categories)

  const serverShoppingList = {}
  Object.assign(serverShoppingList, shoppingList)
  serverShoppingList.recentlyUsed = recentlyUsed
  serverShoppingList.categories = categories

  return deepFreeze(serverShoppingList)
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']), serverShoppingList.categories)
}
