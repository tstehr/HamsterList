import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import {
  CategoryDefinition,
  Change,
  checkAttributeType,
  checkKeys,
  CompletionItem,
  createCategoryDefinition,
  createChange,
  createCompletionItem,
  createOrder,
  createShoppingList,
  Item,
  Order,
  ShoppingList,
  SyncedShoppingList,
} from 'shoppinglist-shared'

export type RecentlyUsed = {
  lastUsedTimestamp: number
  uses: number
  item: CompletionItem
}

export type RecentlyUsedArray = ReadonlyArray<RecentlyUsed>

export type ServerShoppingList = {
  readonly id: string
  readonly title: string
  readonly items: ReadonlyArray<Item>
  readonly recentlyUsed: RecentlyUsedArray
  readonly categories: ReadonlyArray<CategoryDefinition>
  readonly orders: ReadonlyArray<Order>
  readonly changes: ReadonlyArray<Change>
}

export function createServerShoppingList(serverShoppingListSpec: any): ServerShoppingList {
  checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array')
  checkAttributeType(serverShoppingListSpec, 'categories', 'array')
  checkAttributeType(serverShoppingListSpec, 'orders', 'array')
  checkAttributeType(serverShoppingListSpec, 'changes', 'array')

  const recentlyUsed = serverShoppingListSpec.recentlyUsed.map((used: any) => {
    checkKeys(used, ['lastUsedTimestamp', 'uses', 'item'])
    checkAttributeType(used, 'lastUsedTimestamp', 'number')
    checkAttributeType(used, 'uses', 'number')
    checkAttributeType(used, 'item', 'object')
    return { ...used, item: createCompletionItem(used.item) }
  })

  const categories = serverShoppingListSpec.categories.map(createCategoryDefinition)
  const orders = serverShoppingListSpec.orders.map(createOrder)
  const changes = serverShoppingListSpec.changes.map(createChange)
  const shoppingList = createShoppingList(
    _.omit(serverShoppingListSpec, ['recentlyUsed', 'categories', 'orders', 'changes']),
    categories
  )

  const serverShoppingList = {
    ...shoppingList,
    recentlyUsed: recentlyUsed,
    categories: categories,
    orders: orders,
    changes: changes,
  }

  return deepFreeze(serverShoppingList)
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']), serverShoppingList.categories)
}

export function getSyncedShoppingList(serverShoppingList: ServerShoppingList): SyncedShoppingList {
  const changeId = _.last(serverShoppingList.changes)?.id
  return { ...getBaseShoppingList(serverShoppingList), token: '', changeId }
}
