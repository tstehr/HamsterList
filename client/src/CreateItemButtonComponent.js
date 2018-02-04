// @flow
import React from 'react'
import { type LocalItem, type CategoryDefinition } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import './CreateItemButtonComponent.css'

type Props = {
  item: LocalItem,
  categories: $ReadOnlyArray<CategoryDefinition>,
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

  return <button className={className} onClick={() => props.createItem(props.item)}>
    <CategoryComponent categoryId={props.item.category} categories={props.categories}/>
    <div className="CreateItemButtonComponent__name">
      <ItemComponent item={props.item}/>
    </div>
  </button>
}
