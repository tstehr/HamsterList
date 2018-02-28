// @flow
import React, { Component } from 'react'
import FlipMove from 'react-flip-move'
import { type Item, type CategoryDefinition } from 'shoppinglist-shared'
import KeyFocusComponent from './KeyFocusComponent'
import EditItemComponent from './EditItemComponent'
import type { DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import './ShoppingListItemsComponent.css'

type Props = {
  items: $ReadOnlyArray<Item>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
}

export default function ShoppingListItemsComponent(props: Props) {
  return (<KeyFocusComponent
    direction="vertical" rootTagName="ul" className=" ShoppingListItemsComponent"
    style={{minHeight: `${Math.max(3*props.items.length + 3, 7.5)}rem`}}
  >
    <FlipMove
      typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
      enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
    >
      {props.items.map((item) =>
          <EditItemComponent  key={item.id} item={item} categories={props.categories} deleteItem={props.deleteItem} updateItem={props.updateItem} />

      )}
      {!props.items.length &&
        <div className="ShoppingListItemsComponent__emptyList">
          <p>Empty list, nothing needed <span role="img" aria-label="Party Popper">🎉</span></p>
          <p className="ShoppingListItemsComponent__emptyList__addCallout--singleCol">
            <span role="img" aria-label="Arrow to entry form">⬇️ </span>
            Add some new stuff below
            <span role="img" aria-label="Arrow to entry form"> ⬇️</span>
          </p>
          <p className="ShoppingListItemsComponent__emptyList__addCallout--twoCol">
            <span role="img" aria-label="Arrow to entry form">➡️ </span>
            Add some new stuff to the right
            <span role="img" aria-label="Arrow to entry form"> ➡️</span>
          </p>
        </div>
      }
    </FlipMove>
  </KeyFocusComponent>)
}
