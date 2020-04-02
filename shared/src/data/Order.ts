import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, errorMap, nullSafe } from '../util/validation'
import { CategoryDefinition } from './CategoryDefinition'
import { Item } from './Item'

export type CategoryOrder = ReadonlyArray<UUID | undefined | null>

export interface Order {
  readonly id: UUID
  readonly name: string
  readonly categoryOrder: CategoryOrder
}

export function createOrder(orderSpec: any): Order {
  checkKeys(orderSpec, ['id', 'name', 'categoryOrder'])
  checkAttributeType(orderSpec, 'id', 'string')
  checkAttributeType(orderSpec, 'name', 'string')
  checkAttributeType(orderSpec, 'categoryOrder', 'array')

  const order = {
    id: createUUID(orderSpec.id),
    name: orderSpec.name.trim(),
    categoryOrder: errorMap(orderSpec.categoryOrder, nullSafe(createUUID)),
  }

  return deepFreeze(order)
}

export function sortItems(items: ReadonlyArray<Item>, categoryOrder: CategoryOrder): ReadonlyArray<Item> {
  const categoryIteratee = (item: Item): number => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category)))

  return _.sortBy(items, [categoryIteratee, getNameLowerCase, 'id'])
}

export function sortCategories(
  categories: ReadonlyArray<CategoryDefinition>,
  categoryOrder: CategoryOrder
): ReadonlyArray<CategoryDefinition> {
  const categoryIteratee = (cat: CategoryDefinition): number => convertSmallerZeroToInf(categoryOrder.indexOf(cat.id))

  return _.sortBy(categories as CategoryDefinition[], categoryIteratee)
}

export function completeCategoryOrder(
  categoryOrder: CategoryOrder,
  categories: ReadonlyArray<CategoryDefinition>
): CategoryOrder {
  return sortCategories(categories, categoryOrder).map((cat) => cat.id)
}

function undefinedToNull<T>(input?: T | null): T | undefined | null {
  if (input === undefined) {
    return null
  }

  return input
}

function convertSmallerZeroToInf(index: number): number {
  return index < 0 ? Infinity : index
}

function getNameLowerCase(named: { name: string }): string {
  return named.name.toLowerCase()
}
