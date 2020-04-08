import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, createUUIDFromUnknown, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, endValidation, errorMap } from '../util/validation'
import { CategoryDefinition } from './CategoryDefinition'
import { Item } from './Item'

export type CategoryOrder = ReadonlyArray<UUID | undefined | null>

export interface Order {
  readonly id: UUID
  readonly name: string
  readonly categoryOrder: CategoryOrder
}

export function createOrder(orderSpec: unknown): Order {
  if (
    checkKeys(orderSpec, ['id', 'name', 'categoryOrder']) &&
    checkAttributeType(orderSpec, 'id', 'string') &&
    checkAttributeType(orderSpec, 'name', 'string') &&
    checkAttributeType(orderSpec, 'categoryOrder', 'array')
  ) {
    const order = {
      id: createUUID(orderSpec.id),
      name: orderSpec.name.trim(),
      categoryOrder: errorMap(orderSpec.categoryOrder, createUUIDFromUnknown),
    }

    return deepFreeze(order)
  }
  endValidation()
}

export function sortItems(items: readonly Item[], categoryOrder: CategoryOrder): readonly Item[] {
  const categoryIteratee = (item: Item): number => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category)))

  return _.sortBy(items, [categoryIteratee, getNameLowerCase, 'id'])
}

export function sortCategories(
  categories: readonly CategoryDefinition[],
  categoryOrder: CategoryOrder
): readonly CategoryDefinition[] {
  const categoryIteratee = (cat: CategoryDefinition): number => convertSmallerZeroToInf(categoryOrder.indexOf(cat.id))

  return _.sortBy(categories as CategoryDefinition[], categoryIteratee)
}

export function completeCategoryOrder(categoryOrder: CategoryOrder, categories: readonly CategoryDefinition[]): CategoryOrder {
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
