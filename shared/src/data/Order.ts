import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, createUUIDFromUnknown, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, endValidation, errorMap, nullSafe } from '../util/validation'
import { CategoryDefinition, getCategoryMapping } from './CategoryDefinition'
import { Item } from './Item'

export type CategoryOrder = ReadonlyArray<UUID | null>

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
      categoryOrder: errorMap(orderSpec.categoryOrder, resultNotUndefined(nullSafe(createUUIDFromUnknown))),
    }

    return deepFreeze(order)
  }
  endValidation()
}

export function sortItems(items: readonly Item[], categoryOrder: CategoryOrder): readonly Item[] {
  const categoriesPresent = _.chain(items)
    .map((i) => i.category)
    .filter((id): id is string => typeof id === 'string')
    .sort()
    .sortedUniq()
    .value()

  return _.sortBy(items, [
    (item) => convertSmallerZeroToInf(categoryOrder.indexOf(undefinedToNull(item.category))),
    (item) => (item.category ? categoriesPresent.indexOf(item.category) : Infinity),
    getNameLowerCase,
    'id',
  ])
}

export function sortCategories(
  categories: readonly CategoryDefinition[],
  categoryOrder: CategoryOrder
): readonly CategoryDefinition[] {
  const categoryIteratee = (cat: CategoryDefinition): number => convertSmallerZeroToInf(categoryOrder.indexOf(cat.id))

  return _.sortBy(categories as CategoryDefinition[], categoryIteratee)
}

export function completeCategoryOrder(categoryOrder: CategoryOrder, categories: readonly CategoryDefinition[]): CategoryOrder {
  const unknownRemovedCategoryOrder = categoryOrder.filter((cid) => cid === null || categories.some((c) => c.id === cid))
  const missingCategoryIds = categories.map((c) => c.id).filter((cid) => !unknownRemovedCategoryOrder.includes(cid))
  return [...unknownRemovedCategoryOrder, ...missingCategoryIds]
}

export function transformOrderToCategories(
  sourceOrder: Order,
  sourceCategories: readonly CategoryDefinition[],
  targetCategories: readonly CategoryDefinition[]
) {
  const { leftToRight: sourceToTarget } = getCategoryMapping(sourceCategories, targetCategories)
  const mappedCategoryOrder = sourceOrder.categoryOrder
    .map((cid) => (cid === null ? cid : sourceToTarget[cid]))
    .filter((v): v is string[] | null => v === null || (Array.isArray(v) && v.length > 0))
    .map((v) => (v === null ? v : v[0]))
  const categoryOrder = completeCategoryOrder(mappedCategoryOrder, targetCategories)
  return { ...sourceOrder, categoryOrder }
}

function undefinedToNull<T>(input?: T | null): T | null {
  if (input === undefined) {
    return null
  }

  return input
}

function convertSmallerZeroToInf(index: number): number {
  return index < 0 ? Infinity : index
}

function resultNotUndefined<T, R>(func: (a: T) => R | undefined): (a: T) => R {
  return (a) => {
    const result = func(a)
    if (result === undefined) {
      throw new TypeError('The value may not be "undefined"!')
    }
    return result
  }
}

function getNameLowerCase(named: { name: string }): string {
  return named.name.toLowerCase()
}
