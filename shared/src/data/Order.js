// @flow
import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { type Item } from './Item'
import { type CategoryDefinition } from './CategoryDefinition'
import { type UUID, createUUID } from '../util/uuid'
import { checkKeys, checkAttributeType, nullSafe, errorMap } from '../util/validation'

export type CategoryOrder = $ReadOnlyArray<?UUID>

export type Order = {
  +id: UUID,
  +name: string,
  +categoryOrder: CategoryOrder
}

export function createOrder(orderSpec: any): Order {
  checkKeys(orderSpec, ['id', 'name', 'categoryOrder'])
  checkAttributeType(orderSpec, 'id', 'string')
  checkAttributeType(orderSpec, 'name', 'string')
  checkAttributeType(orderSpec, 'categoryOrder', 'array')

  const order = {}
  order.id = createUUID(orderSpec.id)
  order.name = orderSpec.name.trim()
  order.categoryOrder = errorMap(orderSpec.categoryOrder, nullSafe(createUUID))

  return deepFreeze(order)
}


export function sortItems(items: $ReadOnlyArray<Item>, categoryOrder: CategoryOrder): $ReadOnlyArray<Item> {
  const categoryIteratee = (item: Item) => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category)))
  // sortBy doesn't mutate, but isn't annotated correctly...
  return _.sortBy(((items: any): Item[]), [categoryIteratee, getNameLowerCase, 'id'])
}

export function sortCategories(categories: $ReadOnlyArray<CategoryDefinition>, categoryOrder: CategoryOrder): $ReadOnlyArray<CategoryDefinition> {
  const categoryIteratee = (cat: CategoryDefinition) => convertSmallerZeroToInf(categoryOrder.indexOf(cat.id))
  // sortBy doesn't mutate, but isn't annotated correctly...
  return _.sortBy(((categories: any): CategoryDefinition[]), categoryIteratee)
}

export function completeCategoryOrder(categoryOrder: CategoryOrder, categories: $ReadOnlyArray<CategoryDefinition>): CategoryOrder {
  return sortCategories(categories, categoryOrder).map(cat => cat.id)
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
