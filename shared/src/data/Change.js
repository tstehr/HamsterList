// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import differenceInDays from 'date-fns/difference_in_days'

import { type UUID, createUUID } from '../util/uuid'
import { type Item, createItem } from './Item'
import { type BaseShoppingList, type ShoppingList } from './ShoppingList'
import { checkKeys, checkAttributeType, errorMap } from '../util/validation'

export type Change = {|
  +username: ?string,
  +id: UUID,
  +date: Date,
  +diffs: $ReadOnlyArray<Diff>,
|}

export const ADD_ITEM: 'ADD_ITEM' = 'ADD_ITEM'
export type AddItem = {|
  +type: typeof ADD_ITEM,
  +item: Item,
|}

export const UPDATE_ITEM: 'UPDATE_ITEM' = 'UPDATE_ITEM'
export type UpdateItem = {|
  +type: typeof UPDATE_ITEM,
  +oldItem: Item,
  +item: Item,
|}

export const DELETE_ITEM: 'DELETE_ITEM' = 'DELETE_ITEM'
export type DeleteItem = {|
  +type: typeof DELETE_ITEM,
  +oldItem: Item,
|}

export type Diff = AddItem | UpdateItem | DeleteItem

export function createChange(changeSpec: any): Change {
  checkKeys(changeSpec, ['username', 'id', 'date', 'diffs'])
  checkAttributeType(changeSpec, 'username', 'string', true)
  checkAttributeType(changeSpec, 'id', 'string')
  checkAttributeType(changeSpec, 'date', 'string')
  checkAttributeType(changeSpec, 'diffs', 'array')

  const date = new Date(changeSpec.date)
  if (isNaN(date.getTime())) {
    throw new TypeError('Expected attribute "date" to be formatted as an ISO 8061 date')
  }

  const change = {
    username: changeSpec.username,
    id: createUUID(changeSpec.id),
    date: date,
    diffs: errorMap(changeSpec.diffs, createDiff),
  }

  return deepFreeze(change)
}

export function createDiff(diffSpec: any): Diff {
  checkAttributeType(diffSpec, 'type', 'string')

  let diff: Diff

  const type = diffSpec.type
  if (type === ADD_ITEM) {
    checkKeys(diffSpec, ['type', 'item'])
    diff = {
      type: ADD_ITEM,
      item: createItem(diffSpec.item),
    }
  } else if (type === UPDATE_ITEM) {
    checkKeys(diffSpec, ['type', 'oldItem', 'item'])
    diff = {
      type: UPDATE_ITEM,
      oldItem: createItem(diffSpec.oldItem),
      item: createItem(diffSpec.item),
    }
  } else if (type === DELETE_ITEM) {
    checkKeys(diffSpec, ['type', 'oldItem'])
    diff = {
      type: DELETE_ITEM,
      oldItem: createItem(diffSpec.oldItem),
    }
  } else {
    throw new TypeError(`Unknown diff type ${type}`)
  }

  return diff
}

export function getOnlyNewChanges(changes: $ReadOnlyArray<Change>): $ReadOnlyArray<Change> {
  const now = new Date()
  // index of first change that is newer than 14 days
  const dateIndex = _.findIndex(changes, (c) => differenceInDays(now, c.date) < 14)
  // index of first change that is more than 200
  const lengthIndex = Math.max(0, changes.length - 200)
  // slice away the oldest changes
  return changes.slice(Math.min(dateIndex, lengthIndex), changes.length)
}

export function diffShoppingLists(oldShoppingList: BaseShoppingList, newShoppingList: BaseShoppingList): $ReadOnlyArray<Diff> {
  const diffs = []

  const oldMap: { [UUID]: ?Item } = _.keyBy([...oldShoppingList.items], 'id')
  const newMap: { [UUID]: ?Item } = _.keyBy([...newShoppingList.items], 'id')

  const allIds = _.union(_.keys(oldMap), _.keys(newMap))

  for (const id: UUID of allIds) {
    const oldItem = oldMap[id]
    const newItem = newMap[id]

    try {
      if (oldItem != null && newItem != null) {
        diffs.push(generateUpdateItem(oldShoppingList, newItem))
      } else if (newItem != null) {
        diffs.push(generateAddItem(newItem))
      } else {
        //  oldItem != null && newItem == null
        diffs.push(generateDeleteItem(oldShoppingList, id))
      }
    } catch (e) {
      // TypeError means that the diff couldn't be created, which means it isn't needed. We can safely ignore those.
      if (!(e instanceof TypeError)) {
        throw e
      }
    }
  }

  return diffs
}

export function generateAddItem(newItem: Item): AddItem {
  return {
    type: ADD_ITEM,
    item: newItem,
  }
}

export function generateUpdateItem(shoppingList: ShoppingList, newItem: Item): UpdateItem {
  const oldItem = shoppingList.items.find((item) => item.id === newItem.id)
  if (!oldItem) {
    throw TypeError(`Can't create update for item with id ${newItem.id}, it doesn't exist in list.`)
  }
  if (_.isEqual(oldItem, newItem)) {
    throw TypeError(`Can't create update for item with id ${newItem.id}, it is unchanged in the list.`)
  }
  return {
    type: UPDATE_ITEM,
    item: newItem,
    oldItem: oldItem,
  }
}

export function generateDeleteItem(shoppingList: ShoppingList, itemid: UUID): DeleteItem {
  const oldItem = shoppingList.items.find((item) => item.id === itemid)
  if (!oldItem) {
    throw TypeError(`Can't create delete item with id ${itemid}, it doesn't exist in list.`)
  }
  return {
    type: DELETE_ITEM,
    oldItem: oldItem,
  }
}

export function applyDiff(shoppingList: ShoppingList, diff: Diff): ShoppingList {
  if (diff.type === ADD_ITEM) {
    const item = diff.item
    if (shoppingList.items.some((i) => i.id === item.id)) {
      // TODO error type
      throw Error(`Can't apply diff, there already exists an item with id ${item.id}`)
    }

    return {
      ...shoppingList,
      items: [...shoppingList.items, item],
    }
  }

  if (diff.type === UPDATE_ITEM) {
    const index = _findOldItemIndex(shoppingList, diff.oldItem)
    const listItems = [...shoppingList.items]
    listItems[index] = diff.item

    return {
      ...shoppingList,
      items: listItems,
    }
  }

  if (diff.type === DELETE_ITEM) {
    const index = _findOldItemIndex(shoppingList, diff.oldItem)

    let listItems = [...shoppingList.items]
    listItems.splice(index, 1)

    return {
      ...shoppingList,
      items: listItems,
    }
  }

  ;(diff: empty)
  throw TypeError(`Diff to be applied is not an element of type 'Diff'`)
}

export function isDiffApplicable(shoppingList: ShoppingList, diff: Diff): boolean {
  try {
    applyDiff(shoppingList, diff)
    return true
  } catch (e) {
    return false
  }
}

export function createReverseDiff(diff: Diff): Diff {
  if (diff.type === ADD_ITEM) {
    return {
      type: DELETE_ITEM,
      oldItem: diff.item,
    }
  }

  if (diff.type === UPDATE_ITEM) {
    return {
      type: UPDATE_ITEM,
      oldItem: diff.item,
      item: diff.oldItem,
    }
  }

  if (diff.type === DELETE_ITEM) {
    return {
      type: ADD_ITEM,
      item: diff.oldItem,
    }
  }

  ;(diff: empty)
  throw TypeError(`Diff to be reversed is not of type 'Diff'`)
}

export function createApplicableDiff(shoppingList: ShoppingList, diff: Diff): ?Diff {
  if (isDiffApplicable(shoppingList, diff)) {
    return diff
  }

  if (diff.type === ADD_ITEM) {
    const item = diff.item
    const oldItemInList = shoppingList.items.find((i) => i.id === item.id)
    if (_.isEqual(oldItemInList, item)) {
      return null
    } else {
      return generateUpdateItem(shoppingList, diff.item)
    }
  }

  if (diff.type === UPDATE_ITEM) {
    const oldItem = diff.oldItem
    const oldItemInList = shoppingList.items.find((i) => i.id === oldItem.id)
    if (oldItemInList != null) {
      if (_.isEqual(oldItemInList, diff.item)) {
        return null
      } else {
        return generateUpdateItem(shoppingList, diff.item)
      }
    } else {
      return generateAddItem(diff.item)
    }
  }

  if (diff.type === DELETE_ITEM) {
    const oldItem = diff.oldItem
    const oldItemInList = shoppingList.items.find((i) => i.id === oldItem.id)
    if (oldItemInList != null) {
      return {
        type: DELETE_ITEM,
        oldItem: oldItemInList,
      }
    } else {
      return null
    }
  }

  ;(diff: empty)
  throw TypeError(`Diff to be converted to applicable diff is not an element of type 'Diff'`)
}

function _findOldItemIndex(shoppingList: ShoppingList, oldItem: Item) {
  const index = _.findIndex(shoppingList.items, (item) => _.isEqual(item, oldItem))
  if (index === -1) {
    throw Error(`Can't apply diff, old item not found in list`)
  }
  return index
}
