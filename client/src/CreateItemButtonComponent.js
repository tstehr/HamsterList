// @flow
import React from 'react'
import { type LocalItem } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import './CreateItemButtonComponent.css'

type Props = {
  item: LocalItem,
  createItem: CreateItem,
  focused?: boolean,
  noArrowFocus?: boolean
}

export default function CreateItemButtonComponent(props: Props) {
  const classes = ["CreateItemButtonComponent"]
  if (props.focused) {
    classes.push("focused")
  }
  if (props.noArrowFocus) {
    classes.push("noArrowFocus")
  }
  const className = classes.join(" ")

  return <button className={className} onClick={() => props.createItem(props.item)}><ItemComponent item={props.item} /></button>
}
