import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { Item } from './Item'
import { CategoryDefinition } from './CategoryDefinition'
import { createUUID } from '../util/uuid'
import { UUID } from '../util/uuid'
import { checkKeys, checkAttributeType, nullSafe, errorMap } from '../util/validation'
export type CategoryOrder = ReadonlyArray<UUID | undefined | null>
export type Order = {
  readonly id: UUID
  readonly name: string
  readonly categoryOrder: CategoryOrder
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
export function sortItems(items: ReadonlyArray<Item>, categoryOrder: CategoryOrder): ReadonlyArray<Item> {
  const categoryIteratee = (item: Item) => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category))) // sortBy doesn't mutate, but isn't annotated correctly...

  return _.sortBy((items as any) as Item[], [categoryIteratee, getNameLowerCase, 'id'])
}
export function sortCategories(
  categories: ReadonlyArray<CategoryDefinition>,
  categoryOrder: CategoryOrder
): ReadonlyArray<CategoryDefinition> {
  const categoryIteratee = (cat: CategoryDefinition) => convertSmallerZeroToInf(categoryOrder.indexOf(cat.id)) // sortBy doesn't mutate, but isn't annotated correctly...

  return _.sortBy((categories as any) as CategoryDefinition[], categoryIteratee)
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

function convertSmallerZeroToInf(index: number) {
  return index < 0 ? Infinity : index
}

function getNameLowerCase(named: { name: string }) {
  return named.name.toLowerCase()
}
