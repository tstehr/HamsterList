// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type Item, createItem, mergeItems, mergeItemsTwoWay } from './Item'
import { type CategoryDefinition } from './CategoryDefinition'
import { sortItems } from './Order'
import { type UUID } from '../util/uuid'
import { checkKeys, checkAttributeType, errorMap } from '../util/validation'

export type BaseShoppingList = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>
}

export type ShoppingList = {
  +id: string,
  +title: string,
  +items: $ReadOnlyArray<Item>,
  [any]: empty
}

export function createShoppingList(shoppingListSpec: any, categories: ?$ReadOnlyArray<CategoryDefinition>): ShoppingList {
  checkKeys(shoppingListSpec, ['id', 'title', 'items'])
  checkAttributeType(shoppingListSpec, 'id', 'string')
  checkAttributeType(shoppingListSpec, 'title', 'string')
  checkAttributeType(shoppingListSpec, 'items', 'array')

  let items = errorMap(shoppingListSpec.items, createItem)

  let duplicatedIds = _.chain(items).groupBy('id').entries()
    .filter(([, items]) => items.length > 1)
    .map(([id, ]) => id)
    .value()
  if (duplicatedIds.length > 0) {
    throw new TypeError(`ShoppingList "${shoppingListSpec.title}" has duplicated ids: ${duplicatedIds.join(', ')}`)
  }

  if (categories != null) {
    items = sortItems(items, categories.map((cat) => cat.id))
  }

  const shoppingList = {}
  shoppingList.id = shoppingListSpec.id
  shoppingList.title = shoppingListSpec.title
  shoppingList.items = items

  return deepFreeze(shoppingList)
}


export function mergeShoppingLists(base: ShoppingList, client: ShoppingList, server: ShoppingList, categories: ?$ReadOnlyArray<CategoryDefinition>): ShoppingList {
  const newList = {}
  newList.id = base.id

  if (base.title != client.title) {
    newList.title = client.title
  } else {
    newList.title = server.title
  }

  newList.items = []

  const baseMap: {[UUID]: ?Item} = _.keyBy([...base.items], 'id')
  const clientMap: {[UUID]: ?Item} = _.keyBy([...client.items], 'id')
  const serverMap: {[UUID]: ?Item} = _.keyBy([...server.items], 'id')

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
      } else { // client == null && server != null
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
