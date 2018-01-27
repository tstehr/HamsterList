// @flow
import _ from 'lodash'
import { type Iteratee } from 'lodash'
import deepFreeze from 'deep-freeze'
import { type Item, createItem, mergeItems } from './Item'
import { type UUID } from '../util/uuid'
import { checkKeys, checkAttributeType } from '../util/validation'

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

export function createShoppingList(shoppingListSpec: any): ShoppingList {
  checkKeys(shoppingListSpec, ['id', 'title', 'items'])
  checkAttributeType(shoppingListSpec, 'id', 'string')
  checkAttributeType(shoppingListSpec, 'title', 'string')
  checkAttributeType(shoppingListSpec, 'items', 'array')

  const items = shoppingListSpec.items.map(createItem)
  const sortedItems = _.sortBy(items, (['name', 'id'] : Array<Iteratee<Item>>))
  //console.log("items", items)
  //console.log("sorted", sortedItems)

  const shoppingList = {}
  shoppingList.id = shoppingListSpec.id
  shoppingList.title = shoppingListSpec.title
  shoppingList.items = sortedItems

  return deepFreeze(shoppingList)
}

export function mergeShoppingLists(base: ShoppingList, client: ShoppingList, server: ShoppingList): ShoppingList {
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

  for (const id: UUID of _.keys(baseMap)) {
    // $FlowFixMe
    const base: Item = baseMap[id]
    const client = clientMap[id]
    const server = serverMap[id]

    if (client != null && server != null) {
      newList.items.push(mergeItems(base, client, server))
    } else if (client != null) {
      mergeHandleDelete(newList, base, client)
    } else if (server != null) {
      mergeHandleDelete(newList, base, server)
    }
  }

  const newClientIds = _.chain(clientMap).keys().difference(_.keys(baseMap)).value()
  newList.items = newList.items.concat(_.chain(clientMap).pick(newClientIds).values().value())

  const newServerIds = _.chain(serverMap).keys().difference(_.keys(baseMap)).value()
  newList.items = newList.items.concat(_.chain(serverMap).pick(newServerIds).values().value())


  return createShoppingList(newList)
}

function mergeHandleDelete(newList: any, base: Item, remaining: Item) {
  if (!_.isEqual(base, remaining)) {
    newList.items.push(remaining)
  }
}
