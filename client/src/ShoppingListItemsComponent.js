// @flow
import React from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import { type Item, type CategoryDefinition, type Order, type UUID, sortItems, completeCategoryOrder } from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import KeyFocusComponent from './KeyFocusComponent'
import EditItemComponent from './EditItemComponent'
import type { DeleteItem, UpdateItem, SelectOrder } from './ShoppingListContainerComponent'
import OrderSelectComponent from './OrderSelectComponent'
import './ShoppingListItemsComponent.css'

type Props = {
  items: $ReadOnlyArray<Item>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  orders: $ReadOnlyArray<Order>,
  selectedOrder: ?UUID,
  selectOrder: SelectOrder,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
  selectOrder: SelectOrder,
  up: Up,
}

export default function ShoppingListItemsComponent(props: Props) {
  const order = _.find(props.orders, _.matchesProperty('id', props.selectedOrder))
  const items = order == null ? props.items : sortItems(props.items, completeCategoryOrder(order.categoryOrder, props.categories))

  return (<KeyFocusComponent
    direction="vertical" rootTagName="ul" className=" ShoppingListItemsComponent"
    style={{minHeight: `${Math.max(3*props.items.length + 6, 11)}rem`}}
  >
    <FlipMove
      typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
      enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
    >
      {!!props.items.length && !!props.orders.length &&
        <OrderSelectComponent key="OrderSelectComponent" orders={props.orders} selectOrder={props.selectOrder} selectedOrder={props.selectedOrder}/>
      }
      {items.map((item) =>
          <EditItemComponent  key={item.id} item={item} categories={props.categories} deleteItem={props.deleteItem} updateItem={props.updateItem} up={props.up}/>
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
