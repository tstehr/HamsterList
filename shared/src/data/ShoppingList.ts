import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { checkAttributeType, checkKeys, endValidation, errorMap } from '../util/validation.js'
import { CategoryDefinition } from './CategoryDefinition.js'
import { createItem, Item, mergeItems, mergeItemsTwoWay } from './Item.js'
import { sortItems } from './Order.js'

export interface BaseShoppingList {
  readonly id: string
  readonly title: string
  readonly items: readonly Item[]
}
export interface ShoppingList {
  readonly id: string
  readonly title: string
  readonly items: readonly Item[]
}

export function createShoppingList(shoppingListSpec: unknown, categories?: readonly CategoryDefinition[] | null): ShoppingList {
  if (
    checkKeys(shoppingListSpec, ['id', 'title', 'items']) &&
    checkAttributeType(shoppingListSpec, 'id', 'string') &&
    checkAttributeType(shoppingListSpec, 'title', 'string') &&
    checkAttributeType(shoppingListSpec, 'items', 'array')
  ) {
    let items = errorMap(shoppingListSpec.items, createItem)
    const duplicatedIds = _.chain(items)
      .groupBy('id')
      .entries()
      .filter(([, items]) => items.length > 1)
      .map(([id]) => id)
      .value()

    if (duplicatedIds.length > 0) {
      throw new TypeError(`ShoppingList "${shoppingListSpec.title}" has duplicated ids: ${duplicatedIds.join(', ')}`)
    }

    if (categories != null) {
      items = sortItems(
        items,
        categories.map((cat) => cat.id),
      )
    }

    const shoppingList = {
      id: shoppingListSpec.id,
      title: shoppingListSpec.title,
      items: items,
    }

    return deepFreeze(shoppingList)
  }
  endValidation()
}

export function mergeShoppingLists(
  base: ShoppingList,
  client: ShoppingList,
  server: ShoppingList,
  categories?: readonly CategoryDefinition[] | null,
): ShoppingList {
  let title: string
  if (base.title != client.title) {
    title = client.title
  } else {
    title = server.title
  }

  const items = []

  const baseMap = _.keyBy([...base.items], 'id')
  const clientMap = _.keyBy([...client.items], 'id')
  const serverMap = _.keyBy([...server.items], 'id')

  const allIds = _.union(_.keys(baseMap), _.keys(clientMap), _.keys(serverMap))

  for (const id of allIds) {
    const base = baseMap[id]
    const client = clientMap[id]
    const server = serverMap[id]

    if (base == null) {
      if (client != null && server != null) {
        items.push(mergeItemsTwoWay(client, server))
      } else if (client != null) {
        items.push(client)
      } else {
        // client == null && server != null
        items.push(server)
      }
    } else {
      if (client != null && server != null) {
        items.push(mergeItems(base, client, server))
      } else if (client != null) {
        mergeHandleDelete(items, base, client)
      } else if (server != null) {
        mergeHandleDelete(items, base, server)
      }
    }
  }

  return createShoppingList(
    {
      id: base.id,
      items,
      title,
    },
    categories,
  )
}

function mergeHandleDelete(items: Item[], base: Item, remaining: Item): void {
  if (!_.isEqual(base, remaining)) {
    items.push(remaining)
  }
}
