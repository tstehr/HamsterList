// @flow

import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import mathjs from 'mathjs'
import { type UUID, createUUID } from '../util/uuid'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'
import { type Amount, createAmount, createAmountFromString, mergeAmounts, mergeAmountsTwoWay } from './Amount'
import { type CategoryDefinition } from './CategoryDefinition'

export type CompletionItem = {
  +name: string,
  +category: ?UUID // undefined = no category specified | null = category explicitly set to not set
}

export type BaseItem = {
  +name: string,
  +amount: ?Amount,
  +category: ?UUID // undefined = no category specified | null = category explicitly set to not set
}

export type LocalItem = {
  +name: string,
  +amount: ?Amount,
  +category: ?UUID, // undefined = no category specified | null = category explicitly set to not set
}

export type Item = {
  +id: UUID,
  +name: string,
  +amount: ?Amount,
  +category: ?UUID, // undefined = no category specified | null = category explicitly set to not set
}


export function createCompletionItem(completionItemSpec: any): CompletionItem {
  checkKeys(completionItemSpec, ['name', 'category'])
  checkAttributeType(completionItemSpec, 'name', 'string')
  checkAttributeType(completionItemSpec, 'category', 'string', true)

  const item = {}
  item.name = completionItemSpec.name.trim()
  item.category = nullSafe(createUUID)(completionItemSpec.category)

  return deepFreeze(item)
}


export function createLocalItem(localItemSpec: any): LocalItem {
  const localItem = createCompletionItem(_.omit(localItemSpec, ['amount']))
  checkAttributeType(localItemSpec, 'amount', 'object', true)

  const item = {}
  Object.assign(item, localItem)
  item.amount = nullSafe(createAmount)(localItemSpec.amount)

  return deepFreeze(item)
}


export function createLocalItemFromString(stringRepresentation: string, categories: $ReadOnlyArray<CategoryDefinition>): LocalItem {
  let category: ?UUID = undefined
  const categoryResult = stringRepresentation.match(/^\s*\(([^)]+)\)(.*)$/u)
  if (categoryResult != null) {
    const shortName = categoryResult[1]
    if (shortName === "?") {
      category = null
      stringRepresentation = categoryResult[2]
    } else {
      const categoryCandidate = categories.find(cat => cat.shortName.toUpperCase() == shortName.toUpperCase())
      if (categoryCandidate) {
        category = categoryCandidate.id
        stringRepresentation = categoryResult[2]
      }
    }
  }

  const split = stringRepresentation.trim().split(/\s+/)

  for (let i = split.length; i > 0; i--) {
    const str = split.slice(0, i).join(" ")
    try {
      const amount = createAmountFromString(str)
      return createLocalItem({
        name: split.slice(i, split.length).join(" "),
        amount: amount,
        category: category,
      })
    } catch (e) {
      // ignore and try again
    }
  }

  return createLocalItem({
    name: split.join(" "),
    category: category,
  })
}



export function createLocalItemFromItemStringRepresentation(itemStringRepresentation: any, categories: $ReadOnlyArray<CategoryDefinition>): LocalItem {
  checkKeys(itemStringRepresentation, ['stringRepresentation'])
  checkAttributeType(itemStringRepresentation, 'stringRepresentation', 'string')

  return createLocalItemFromString(itemStringRepresentation.stringRepresentation, categories)
}


export function createItem(itemSpec: any): Item {
  const localItem = createLocalItem(_.omit(itemSpec, ['id']))
  checkAttributeType(itemSpec, 'id', 'string')

  const item = {}
  Object.assign(item, localItem)
  item.id = createUUID(itemSpec.id)

  return deepFreeze(item)
}

export function createItemFromItemStringRepresentation(itemStringRepresentation: any, categories: $ReadOnlyArray<CategoryDefinition>): Item {
  const localItem = createLocalItemFromItemStringRepresentation(_.omit(itemStringRepresentation, ['id']), categories)

  const item = {}
  Object.assign(item, localItem)
  item.id = createUUID(itemStringRepresentation.id)

  return deepFreeze(item)
}

export function itemToString(item: BaseItem): string {
  const name = item.name != null ? item.name.trim() : ""
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
  const newItem = {}
  newItem.id = base.id

  /**
   * Assumption: Item dosn't change identity, that is no changes that make new completely unrelated to old. In that case, changes to name
   * add information. We assume that length correlates with amount of information, therefore prefer the longer title
   */
  if (base.name != client.name && base.name != server.name) {
    if (client.name.length < server.name.length) {
      newItem.name = server.name
    } else {
      newItem.name = client.name
    }
  } else if (base.name != client.name) {
    newItem.name = client.name
  } else {
    newItem.name = server.name
  }

  // Client change wins if it exists
  if (base.category != client.category) {
    newItem.category = client.category
  } else {
    newItem.category = server.category
  }

  newItem.amount = mergeAmounts(base.amount, client.amount, server.amount)

  return createItem(newItem)
}

export function mergeItemsTwoWay(client: Item, server: Item): Item {
  const newItem = {}
  newItem.id = client.id

  if (client.name.length < server.name.length) {
    newItem.name = server.name
  } else {
    newItem.name = client.name
  }

  newItem.category = client.category
  newItem.amount = mergeAmountsTwoWay(client.amount, server.amount)

  return createItem(newItem)
}

export function addMatchingCategory<T: LocalItem>(item: T, completions: $ReadOnlyArray<CompletionItem>): T {
  const exactMatchingCompletion = completions
    .find((completionItem) =>
      completionItem.name === item.name
        && (item.category === undefined || item.category === completionItem.category)
    )
  if (exactMatchingCompletion != null) {
    // $FlowFixMe
    return Object.assign({}, item, _.omitBy(exactMatchingCompletion, (val) => val == null))
  }

  const matchingCompletion = completions
    .find((completionItem) =>
      normalizeCompletionName(completionItem.name) === normalizeCompletionName(item.name)
        && (item.category === undefined || item.category === completionItem.category)
    )
  if (matchingCompletion != null) {
    // $FlowFixMe
    return Object.assign({}, item, _.omitBy(matchingCompletion, (val) => val == null))
  }

  return item
}

export function normalizeCompletionName(name: string): string {
  return name.trim().toLowerCase()
}