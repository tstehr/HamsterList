// @flow
import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { type Iteratee } from 'lodash'
import { type Item } from './Item'
import { type UUID, createUUID } from '../util/uuid'
import { checkKeys, checkAttributeType, nullSafe, errorMap } from '../util/validation'

export type CategoryOrder = $ReadOnlyArray<?UUID>

export type Order = {
  +name: string,
  +categoryOrder: CategoryOrder
}

export function createOrder(orderSpec: any): Order {
  checkKeys(orderSpec, ['name', 'categoryOrder'])
  checkAttributeType(orderSpec, 'name', 'string')
  checkAttributeType(orderSpec, 'categoryOrder', 'array')

  const order = {}
  order.name = orderSpec.name.trim()
  order.categoryOrder = errorMap(orderSpec.categoryOrder, nullSafe(createUUID))

  return deepFreeze(order)
}


export function sortItems(items: $ReadOnlyArray<Item>, categoryOrder: CategoryOrder): $ReadOnlyArray<Item> {
  const categoryIteratee = (item: Item) => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category)))
  // sortBy doesn't mutate, but isn't annotated correctly...
  return _.sortBy(((items: any): Item[]), ([categoryIteratee, getNameLowerCase, 'id'] : Array<Iteratee<Item>>))
}

function undefinedToNull<T>(input: ?T): ?T {
  if (input === undefined) {
    return null
  }
  return input
}


function convertSmallerZeroToInf(index: number) {
  return index < 0 ? Infinity : index
}

function getNameLowerCase(named: {name: string}) {
  return named.name.toLowerCase()
}
