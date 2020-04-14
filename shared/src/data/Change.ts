import differenceInDays from 'date-fns/differenceInDays'
import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, endValidation, errorMap, isIndexable } from '../util/validation'
import { createItem, Item } from './Item'
import { BaseShoppingList, ShoppingList } from './ShoppingList'

export interface Change {
  readonly username: string | undefined | null
  readonly id: UUID
  readonly date: Date | deepFreeze.DeepReadonly<Date>
  readonly diffs: readonly Diff[]
}

export const ADD_ITEM: 'ADD_ITEM' = 'ADD_ITEM'
export interface AddItem {
  readonly type: typeof ADD_ITEM
  readonly item: Item
}

export const UPDATE_ITEM: 'UPDATE_ITEM' = 'UPDATE_ITEM'
export interface UpdateItem {
  readonly type: typeof UPDATE_ITEM
  readonly oldItem: Item
  readonly item: Item
}

export const DELETE_ITEM: 'DELETE_ITEM' = 'DELETE_ITEM'
export interface DeleteItem {
  readonly type: typeof DELETE_ITEM
  readonly oldItem: Item
}

export type Diff = AddItem | UpdateItem | DeleteItem

export function createChange(changeSpec: unknown): Change {
  if (
    checkKeys(changeSpec, ['username', 'id', 'date', 'diffs']) &&
    checkAttributeType(changeSpec, 'username', 'string', true) &&
    checkAttributeType(changeSpec, 'id', 'string') &&
    checkAttributeType(changeSpec, 'date', 'string') &&
    checkAttributeType(changeSpec, 'diffs', 'array')
  ) {
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
  endValidation()
}

export function createDiff(diffSpec: unknown): Diff {
  if (isIndexable(diffSpec)) {
    let diff: Diff
    if (diffSpec.type === ADD_ITEM && checkKeys(diffSpec, ['type', 'item'])) {
      diff = {
        type: ADD_ITEM,
        item: createItem(diffSpec.item),
      }
    } else if (diffSpec.type === UPDATE_ITEM && checkKeys(diffSpec, ['type', 'oldItem', 'item'])) {
      diff = {
        type: UPDATE_ITEM,
        oldItem: createItem(diffSpec.oldItem),
        item: createItem(diffSpec.item),
      }
    } else if (diffSpec.type === DELETE_ITEM && checkKeys(diffSpec, ['type', 'oldItem'])) {
      diff = {
        type: DELETE_ITEM,
        oldItem: createItem(diffSpec.oldItem),
      }
    } else {
      throw new TypeError(`Unknown diff type ${diffSpec.type}`)
    }

    return deepFreeze(diff)
  }
  endValidation()
}

export function getOnlyNewChanges(changes: readonly Change[]): readonly Change[] {
  const now = new Date()

  // index of first change that is newer than 14 days
  const dateIndex = _.findIndex(changes, (c) => differenceInDays(now, c.date as Date) < 14)

  // index of first change that is more than 200
  const lengthIndex = Math.max(0, changes.length - 200)

  // slice away the oldest changes
  return changes.slice(Math.min(dateIndex, lengthIndex), changes.length)
}

export function diffShoppingLists(oldShoppingList: BaseShoppingList, newShoppingList: BaseShoppingList): readonly Diff[] {
  const diffs = []

  const oldMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...oldShoppingList.items], 'id')

  const newMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...newShoppingList.items], 'id')

  const allIds = _.union(_.keys(oldMap), _.keys(newMap))

  for (const id of allIds) {
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
  switch (diff.type) {
    case ADD_ITEM: {
      const item = diff.item

      if (shoppingList.items.some((i) => i.id === item.id)) {
        // TODO error type
        throw Error(`Can't apply diff, there already exists an item with id ${item.id}`)
      }

      return { ...shoppingList, items: [...shoppingList.items, item] }
    }

    case UPDATE_ITEM: {
      const index = _findOldItemIndex(shoppingList, diff.oldItem)

      const listItems = [...shoppingList.items]
      listItems[index] = diff.item
      return { ...shoppingList, items: listItems }
    }

    case DELETE_ITEM: {
      const index = _findOldItemIndex(shoppingList, diff.oldItem)

      const listItems = [...shoppingList.items]
      listItems.splice(index, 1)
      return { ...shoppingList, items: listItems }
    }
  }

  exhaustiveCheck(diff, `Diff to be applied is not an element of type 'Diff'`)
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
  switch (diff.type) {
    case ADD_ITEM: {
      return {
        type: DELETE_ITEM,
        oldItem: diff.item,
      }
    }
    case UPDATE_ITEM: {
      return {
        type: UPDATE_ITEM,
        oldItem: diff.item,
        item: diff.oldItem,
      }
    }
    case DELETE_ITEM: {
      return {
        type: ADD_ITEM,
        item: diff.oldItem,
      }
    }
  }

  exhaustiveCheck(diff, `Diff to be reversed is not of type 'Diff'`)
}

export function createApplicableDiff(shoppingList: ShoppingList, diff: Diff): Diff | undefined | null {
  if (isDiffApplicable(shoppingList, diff)) {
    return diff
  }

  switch (diff.type) {
    case ADD_ITEM: {
      const item = diff.item
      const oldItemInList = shoppingList.items.find((i) => i.id === item.id)

      if (_.isEqual(oldItemInList, item)) {
        return null
      } else {
        return generateUpdateItem(shoppingList, diff.item)
      }
    }

    case UPDATE_ITEM: {
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

    case DELETE_ITEM: {
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
  }

  exhaustiveCheck(diff, `Diff to be converted to applicable diff is not an element of type 'Diff'`)
}

function _findOldItemIndex(shoppingList: ShoppingList, oldItem: Item): number {
  const index = _.findIndex(shoppingList.items, (item) => _.isEqual(item, oldItem))

  if (index === -1) {
    throw Error(`Can't apply diff, old item not found in list`)
  }

  return index
}

function exhaustiveCheck(param: never, errorMsg: string): never {
  throw TypeError(errorMsg)
}
