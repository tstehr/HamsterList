import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { createItem, mergeItems, mergeItemsTwoWay } from './Item'
import { Item } from './Item'
import { CategoryDefinition } from './CategoryDefinition'
import { sortItems } from './Order'
import { UUID } from '../util/uuid'
import { checkKeys, checkAttributeType, errorMap } from '../util/validation'
export type BaseShoppingList = {
  readonly id: string
  readonly title: string
  readonly items: ReadonlyArray<Item>
}
export type ShoppingList = {
  readonly id: string
  readonly title: string
  readonly items: ReadonlyArray<Item>
  [x: any]: never
}
export function createShoppingList(shoppingListSpec: any, categories?: ReadonlyArray<CategoryDefinition> | null): ShoppingList {
  checkKeys(shoppingListSpec, ['id', 'title', 'items'])
  checkAttributeType(shoppingListSpec, 'id', 'string')
  checkAttributeType(shoppingListSpec, 'title', 'string')
  checkAttributeType(shoppingListSpec, 'items', 'array')
  let items = errorMap(shoppingListSpec.items, createItem)

  let duplicatedIds = _.chain(items)
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
      categories.map((cat) => cat.id)
    )
  }

  const shoppingList = {}
  shoppingList.id = shoppingListSpec.id
  shoppingList.title = shoppingListSpec.title
  shoppingList.items = items
  return deepFreeze(shoppingList)
}
export function mergeShoppingLists(
  base: ShoppingList,
  client: ShoppingList,
  server: ShoppingList,
  categories?: ReadonlyArray<CategoryDefinition> | null
): ShoppingList {
  const newList = {}
  newList.id = base.id

  if (base.title != client.title) {
    newList.title = client.title
  } else {
    newList.title = server.title
  }

  newList.items = []

  const baseMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...base.items], 'id')

  const clientMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...client.items], 'id')

  const serverMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...server.items], 'id')

  const allIds = _.union(_.keys(baseMap), _.keys(clientMap), _.keys(serverMap))

  for (const id: UUID of allIds) {
    const base = baseMap[id]
    const client = clientMap[id]
    const server = serverMap[id]

    if (base == null) {
      if (client != null && server != null) {
        newList.items.push(mergeItemsTwoWay(client, server))
      } else if (client != null) {
        newList.items.push(client)
      } else {
        // client == null && server != null
        newList.items.push(server)
      }
    } else {
      if (client != null && server != null) {
        newList.items.push(mergeItems(base, client, server))
      } else if (client != null) {
        mergeHandleDelete(newList, base, client)
      } else if (server != null) {
        mergeHandleDelete(newList, base, server)
      }
    }
  }

  return createShoppingList(newList, categories)
}

function mergeHandleDelete(newList: any, base: Item, remaining: Item) {
  if (!_.isEqual(base, remaining)) {
    newList.items.push(remaining)
  }
}
