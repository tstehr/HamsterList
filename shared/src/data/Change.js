// @flow
import { type UUID } from '../util/uuid'
import { type Item } from './Item'
import { type ShoppingList } from './ShoppingList'

export const UPDATE_ITEM: 'UPDATE_ITEM' = 'UPDATE_ITEM'
export type UpdateItem = {|
  +type: typeof UPDATE_ITEM,
  +item: Item,
  +oldItem: Item,
|}

export const ADD_ITEM: 'ADD_ITEM' = 'ADD_ITEM'
export type AddItem = {|
  +type: typeof ADD_ITEM,
  +item: Item,
|}

export const DELETE_ITEM: 'DELETE_ITEM' = 'DELETE_ITEM'
export type DeleteItem = {|
  +type: typeof DELETE_ITEM,
  +oldItem: Item,
|}

export type Diff = UpdateItem | AddItem | DeleteItem


function createUpdateItem(shoppingList: ShoppingList, itemId: UUID): UpdateItem {
  return {
    type: UPDATE_ITEM,

  }
}
