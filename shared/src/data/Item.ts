import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import * as mathjs from 'mathjs'
import { createUUID, UUID } from '../util/uuid.js'
import { checkAttributeType, checkKeys, endValidation, isIndexable, nullSafe } from '../util/validation.js'
import { Amount, createAmount, createAmountFromString, mergeAmounts, mergeAmountsTwoWay } from './Amount.js'
import { CategoryDefinition, getCategoryMapping } from './CategoryDefinition.js'

export interface CompletionItem {
  readonly name: string
  readonly category: UUID | undefined | null
}

export interface BaseItem {
  readonly name: string
  readonly amount?: Amount | undefined | null
  readonly category?: UUID | undefined | null
}

export interface LocalItem {
  readonly name: string
  readonly amount?: Amount | undefined | null
  readonly category?: UUID | undefined | null
}

export interface Item {
  readonly id: UUID
  readonly name: string
  readonly amount?: Amount | undefined | null
  readonly category?: UUID | undefined | null
}

export function createCompletionItem(completionItemSpec: unknown): CompletionItem {
  if (
    checkKeys(completionItemSpec, ['name', 'category']) &&
    checkAttributeType(completionItemSpec, 'name', 'string') &&
    checkAttributeType(completionItemSpec, 'category', 'string', true)
  ) {
    const item = {
      name: completionItemSpec.name.trim(),
      category: nullSafe(createUUID)(completionItemSpec.category),
    }

    return deepFreeze(item)
  }
  endValidation()
}

export function createLocalItem(localItemSpecArg: unknown, transformItemSpec?: (itemSpec: unknown) => unknown): LocalItem {
  const localItemSpec = transformItemSpec ? transformItemSpec(localItemSpecArg) : localItemSpecArg
  if (isIndexable(localItemSpec)) {
    const completionItem = createCompletionItem(_.omit(localItemSpec, ['amount']))
    const localItem = {
      ...completionItem,
      amount: nullSafe(createAmount)(localItemSpec.amount),
    }

    return deepFreeze(localItem)
  }
  endValidation()
}

export function createLocalItemFromString(stringRepresentation: string, categories: readonly CategoryDefinition[]): LocalItem {
  let category: UUID | undefined | null = undefined
  const categoryResult = /^\s*\(([^)]+)\)(.*)$/u.exec(stringRepresentation)

  if (categoryResult != null) {
    const shortName = categoryResult[1]

    if (shortName === '?') {
      category = null
      stringRepresentation = categoryResult[2]
    } else {
      const categoryCandidate = categories.find((cat) => cat.shortName.toUpperCase() == shortName.toUpperCase())

      if (categoryCandidate) {
        category = categoryCandidate.id
        stringRepresentation = categoryResult[2]
      }
    }
  }

  const split = stringRepresentation.trim().split(/\s+/)

  for (let i = split.length; i > 0; i--) {
    const str = split.slice(0, i).join(' ')

    try {
      const amount = createAmountFromString(str)
      return createLocalItem({
        name: split.slice(i, split.length).join(' '),
        amount: amount,
        category: category,
      })
    } catch (e) {
      // ignore and try again
    }
  }

  return createLocalItem({
    name: split.join(' '),
    category: category,
  })
}

export function createLocalItemFromItemStringRepresentation(
  itemStringRepresentation: unknown,
  categories: readonly CategoryDefinition[],
): LocalItem {
  if (
    checkKeys(itemStringRepresentation, ['stringRepresentation']) &&
    checkAttributeType(itemStringRepresentation, 'stringRepresentation', 'string')
  ) {
    return createLocalItemFromString(itemStringRepresentation.stringRepresentation, categories)
  }
  endValidation()
}

export function createItem(itemSpecArg: unknown, transformItemSpec?: (itemSpec: unknown) => unknown): Item {
  const itemSpec = transformItemSpec ? transformItemSpec(itemSpecArg) : itemSpecArg
  if (isIndexable(itemSpec)) {
    const localItem = createLocalItem(_.omit(itemSpec, ['id']))

    if (checkAttributeType(itemSpec, 'id', 'string')) {
      const item = {
        ...localItem,
        id: createUUID(itemSpec.id),
      }
      return deepFreeze(item)
    }
  }
  endValidation()
}

export function createItemFromItemStringRepresentation(
  itemStringRepresentation: unknown,
  categories: readonly CategoryDefinition[],
): Item {
  if (isIndexable(itemStringRepresentation)) {
    const localItem = createLocalItemFromItemStringRepresentation(_.omit(itemStringRepresentation, ['id']), categories)
    if (checkAttributeType(itemStringRepresentation, 'id', 'string')) {
      const item = {
        ...localItem,
        id: createUUID(itemStringRepresentation.id),
      }
      return deepFreeze(item)
    }
  }
  endValidation()
}

export function itemToString(item: BaseItem): string {
  const name = item.name != null ? item.name.trim() : ''
  const amount = item.amount

  if (amount != null) {
    const unit = amount.unit

    if (unit != null) {
      return `${mathjs.round(amount.value, 2)} ${unit.trim()} ${name}`
    } else {
      return `${mathjs.round(amount.value, 2)} ${name}`
    }
  } else {
    return name
  }
}

export function mergeItems(base: Item, client: Item, server: Item): Item {
  /**
   * Assumption: Item doesn't change identity, that is no changes that make new completely unrelated to old. In that case, changes to name
   * add information. We assume that length correlates with amount of information, therefore prefer the longer title
   */
  let name: string
  if (base.name != client.name && base.name != server.name) {
    if (client.name.length < server.name.length) {
      name = server.name
    } else {
      name = client.name
    }
  } else if (base.name != client.name) {
    name = client.name
  } else {
    name = server.name
  }

  // Client change wins if it exists
  let category: UUID | null | undefined
  if (base.category != client.category) {
    category = client.category
  } else {
    category = server.category
  }

  return {
    id: base.id,
    name,
    category,
    amount: mergeAmounts(base.amount, client.amount, server.amount),
  }
}

export function mergeItemsTwoWay(client: Item, server: Item): Item {
  let name: string
  if (client.name.length < server.name.length) {
    name = server.name
  } else {
    name = client.name
  }

  return {
    id: client.id,
    name,
    category: client.category,
    amount: mergeAmountsTwoWay(client.amount, server.amount),
  }
}

export function addMatchingCategory<T extends LocalItem>(item: T, completions: readonly CompletionItem[]): T {
  const exactMatchingCompletion = completions.find(
    (completionItem) =>
      item.name === completionItem.name && (item.category === undefined || item.category === completionItem.category),
  )
  if (exactMatchingCompletion != null) {
    return addCompletionToItem<T>(item, exactMatchingCompletion)
  }

  const normalizedItemName = normalizeCompletionName(item.name)
  const matchingCompletion = completions.find(
    (completionItem) =>
      normalizedItemName === normalizeCompletionName(completionItem.name) &&
      (item.category === undefined || item.category === completionItem.category),
  )
  if (matchingCompletion != null) {
    return addCompletionToItem<T>(item, matchingCompletion)
  }

  // Match ignoring everything after the first "(", to allow items like "Eggs (large)" to get the completions for "Eggs"
  const [head, ...rest] = item.name.split(/(?=\s*\()/)
  const tail = rest.join('')
  if (head && tail) {
    const normalizedHead = normalizeCompletionName(head)
    const looseMatchingCompletion = completions.find(
      (completionItem) =>
        normalizedHead === normalizeCompletionName(completionItem.name) &&
        (item.category === undefined || item.category === completionItem.category),
    )
    if (looseMatchingCompletion != null) {
      return { ...addCompletionToItem<T>(item, looseMatchingCompletion), name: looseMatchingCompletion.name + tail }
    }
  }

  return item
}

function addCompletionToItem<T extends LocalItem>(item: T, matchingCompletion: CompletionItem): T {
  return Object.assign(
    {},
    item,
    _.omitBy(matchingCompletion, (val) => val == null),
  )
}

export function normalizeCompletionName(name: string): string {
  return name.trim().toLowerCase()
}

export function transformItemsToCategories<T extends { category?: UUID | null | undefined }>(
  sourceItems: readonly T[],
  sourceCategories: readonly CategoryDefinition[],
  targetCategories: readonly CategoryDefinition[],
): readonly T[] {
  const { leftToRight: sourceToTarget } = getCategoryMapping(sourceCategories, targetCategories)
  return sourceItems.map((i) => {
    if (!i.category) {
      return i
    }
    const mapped = sourceToTarget[i.category]
    return {
      ...i,
      category: _.head(mapped) ?? i.category,
    }
  })
}
