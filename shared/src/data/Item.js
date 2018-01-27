// @flow

import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import mathjs from 'mathjs'
import { type UUID, createUUID } from '../util/uuid'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'
import { type Amount, createAmount, createAmountFromString, mergeAmounts } from './Amount'

export type CompletionItem = {
  +name: string,
  +category: ?UUID
}

export type BaseItem = {
  +name: string,
  +amount: ?Amount,
  +category: ?UUID
}

export type LocalItem = {
  +name: string,
  +amount: ?Amount,
  +category: ?UUID,
  [any]: empty
}

export type Item = {
  +id: UUID,
  +name: string,
  +amount: ?Amount,
  +category: ?UUID,
  [any]: empty
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


export function createLocalItemFromString(stringRepresentation: string): LocalItem {
  const split = stringRepresentation.trim().split(/\s+/)

  for (let i = split.length; i > 0; i--) {
    const str = split.slice(0, i).join(" ")
    try {
      const amount = createAmountFromString(str)
      return createLocalItem({
        name: split.slice(i, split.length).join(" "),
        amount: amount
      })
    } catch (e) {
      if (!e instanceof SyntaxError) {
        throw e
      }
    }
  }

  return createLocalItem({name: split.join(" ")})
}

export function createItem(itemSpec: any): Item {
  const localItem = createLocalItem(_.omit(itemSpec, ['id']))
  checkAttributeType(itemSpec, 'id', 'string')

  const item = {}
  Object.assign(item, localItem)
  item.id = createUUID(itemSpec.id)

  return deepFreeze(item)
}

export function itemToString(item: BaseItem): string {
  const amount = item.amount
  if (amount != null) {
    const unit = amount.unit
    if (unit != null) {
      return `${mathjs.round(amount.value, 2)} ${unit.trim()} ${item.name.trim()}`
    } else {
      return `${mathjs.round(amount.value, 2)} ${item.name.trim()}`
    }
  } else {
    return item.name.trim()
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

// export function updateLocalItem(localItem: Item, localItemSpec: Object): Item {
//   return createLocalItem(_.merge({}, ((localItem : any): Object), localItemSpec))
// }
//
// export function updateItem(item: Item, itemSpec: Object): Item {
//   return createItem(_.merge({}, ((item : any): Object), itemSpec))
// }
