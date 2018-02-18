// @flow
import React, { Component } from 'react'
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
  noArrowFocus?: boolean,
  onFocus?: (SyntheticFocusEvent<>) => void,
  onBlur?: (SyntheticFocusEvent<>) => void
}

export default class CreateItemButtonComponent extends Component<Props> {
  render() {
    const props = this.props
    
    const classes = ["CreateItemButtonComponent"]
    if (props.focused) {
      classes.push("focused")
    }
    if (props.noArrowFocus) {
      classes.push("KeyFocusComponent--noFocus")
    }
    const className = classes.join(" ")

    return <button className={className} onClick={() => props.createItem(props.item)} onFocus={props.onFocus} onBlur={props.onBlur}>
      <CategoryComponent categoryId={props.item.category} categories={props.categories}/>
      <div className="CreateItemButtonComponent__name">
        <ItemComponent item={props.item}/>
      </div>
    </button>
  }
}
