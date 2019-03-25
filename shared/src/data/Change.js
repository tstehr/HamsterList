// @flow
import _ from 'lodash'
import { type UUID } from '../util/uuid'
import { type Item } from './Item'
import { type ShoppingList } from './ShoppingList'



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

export function diffShoppingLists(oldShoppingList: ShoppingList, newShoppingList: ShoppingList): $ReadOnlyArray<Diff> {
  const diffs = []

  const oldMap: {[UUID]: ?Item} = _.keyBy([...oldShoppingList.items], 'id')
  const newMap: {[UUID]: ?Item} = _.keyBy([...newShoppingList.items], 'id')

  const allIds = _.union(_.keys(oldMap), _.keys(newMap))

  for (const id: UUID of allIds) {
    const oldItem = oldMap[id]
    const newItem = newMap[id]

    try {
      if (oldItem != null && newItem != null) {
        diffs.push(createUpdateItem(oldShoppingList, newItem))
      } else if (oldItem != null) {
        diffs.push(createDeleteItem(oldShoppingList, id))
      } else if (newItem != null) {
        diffs.push(createAddItem(newItem))
      }
    } catch(e) {
      // TypeError means that the diff couldn't be created, which means it isn't needed. We can safely ignore those.
      if (!(e instanceof TypeError)) {
        throw e
      }
    }

  }

  return diffs
}

export function createAddItem(newItem: Item): AddItem {
  return {
    type: ADD_ITEM,
    item: newItem,
  }
}

export function createUpdateItem(shoppingList: ShoppingList, newItem: Item): UpdateItem {
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

export function createDeleteItem(shoppingList: ShoppingList, itemid: UUID): DeleteItem {
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

  (diff: empty)
  throw TypeError(`Diff to be applied is not an element of type 'Diff'`)
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

  (diff: empty)
  throw TypeError(`Diff to be reversed is not of type 'Diff'`)
}


function _findOldItemIndex(shoppingList: ShoppingList, oldItem: Item) {
  const index = _.findIndex(shoppingList.items, (item) => _.isEqual(item, oldItem))
  if (index === -1) {
      throw Error(`Can't apply diff, old item not found in list`)
  }
  return index
}
