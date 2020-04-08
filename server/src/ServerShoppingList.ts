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
  endValidation,
  getLiteralKeys,
  isIndexable,
  Item,
  Order,
  ShoppingList,
  sortItems,
  SyncedShoppingList,
} from 'shoppinglist-shared'

export interface RecentlyUsed {
  lastUsedTimestamp: number
  uses: number
  item: CompletionItem
}

export type RecentlyUsedArray = readonly RecentlyUsed[]

export interface ServerShoppingList {
  readonly id: string
  readonly title: string
  readonly items: readonly Item[]
  readonly recentlyUsed: RecentlyUsedArray
  readonly categories: readonly CategoryDefinition[]
  readonly orders: readonly Order[]
  readonly changes: readonly Change[]
}

export function createServerShoppingList(serverShoppingListSpec: unknown): ServerShoppingList {
  if (isIndexable(serverShoppingListSpec)) {
    const shoppingList = createShoppingList(_.omit(serverShoppingListSpec, ['recentlyUsed', 'categories', 'orders', 'changes']))
    if (
      checkKeys(serverShoppingListSpec, [...getLiteralKeys(shoppingList), 'recentlyUsed', 'categories', 'orders', 'changes']) &&
      checkAttributeType(serverShoppingListSpec, 'recentlyUsed', 'array') &&
      checkAttributeType(serverShoppingListSpec, 'categories', 'array') &&
      checkAttributeType(serverShoppingListSpec, 'orders', 'array') &&
      checkAttributeType(serverShoppingListSpec, 'changes', 'array')
    ) {
      const recentlyUsed = serverShoppingListSpec.recentlyUsed.map(
        (used: unknown): RecentlyUsed => {
          if (
            checkKeys(used, ['lastUsedTimestamp', 'uses', 'item']) &&
            checkAttributeType(used, 'lastUsedTimestamp', 'number') &&
            checkAttributeType(used, 'uses', 'number') &&
            checkAttributeType(used, 'item', 'object')
          ) {
            return { ...used, item: createCompletionItem(used.item) }
          }
          endValidation()
        }
      )

      const categories = serverShoppingListSpec.categories.map(createCategoryDefinition)
      const orders = serverShoppingListSpec.orders.map(createOrder)
      const changes = serverShoppingListSpec.changes.map(createChange)

      const serverShoppingList = {
        ...shoppingList,
        items: sortItems(
          shoppingList.items,
          categories.map((cat) => cat.id)
        ),
        recentlyUsed: recentlyUsed,
        categories: categories,
        orders: orders,
        changes: changes,
      }

      return deepFreeze(serverShoppingList)
    }
  }
  endValidation()
}

export function getBaseShoppingList(serverShoppingList: ServerShoppingList): ShoppingList {
  return createShoppingList(_.pick(serverShoppingList, ['id', 'title', 'items']), serverShoppingList.categories)
}

export function getSyncedShoppingList(serverShoppingList: ServerShoppingList): SyncedShoppingList {
  const changeId = _.last(serverShoppingList.changes)?.id
  return { ...getBaseShoppingList(serverShoppingList), token: '', changeId }
}
