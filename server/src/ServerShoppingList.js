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
  const shoppingList = createShoppingList(_.omit(serverShoppingListSpec, ['recentlyUsed']))
  checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array')

  const recentlyUsed = serverShoppingListSpec.recentlyUsed.map(used => {
    checkKeys(used, ['lastUsedTimestamp', 'uses', 'item'])
    checkAttributeType(used, 'lastUsedTimestamp', 'number')
    checkAttributeType(used, 'uses', 'number')
    checkAttributeType(used, 'item', 'object')

    return {...used, item: createCompletionItem(used.item)}
  })

  const serverShoppingList = {}
  Object.assign(serverShoppingList, shoppingList)
  serverShoppingList.recentlyUsed = recentlyUsed

  console.log(`Created shopping list ${serverShoppingList.id}`)

  return deepFreeze(serverShoppingList)
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']))
}
