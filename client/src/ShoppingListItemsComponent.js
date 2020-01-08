// @flow
import React from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import { type Item, type CategoryDefinition, type Order, type CategoryOrder, type UUID, sortItems, completeCategoryOrder } from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import KeyFocusComponent from './KeyFocusComponent'
import EditItemComponent from './EditItemComponent'
import type { DeleteItem, UpdateItem, SelectOrder } from './ShoppingListContainerComponent'
import OrderSelectComponent from './OrderSelectComponent'
import { CategoryListItemComponent } from './CategoryComponent'
import './ShoppingListItemsComponent.css'
import classNames from 'classnames'
import './CategoryComponent.css'

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

type ItemOrCategory = {type: "item", item: Item} | {type: "category", categoryId: ?UUID}

function createItemOrCategoryList(order: CategoryOrder, items: $ReadOnlyArray<Item>): $ReadOnlyArray<ItemOrCategory> {
  const sortedItems = sortItems(items, order)

  const itemOrCategoryList = []
  let prevCategory = null
  for (const item of sortedItems) {
    if (item.category !== prevCategory) {
      itemOrCategoryList.push({type: "category", categoryId: item.category})
    }
    itemOrCategoryList.push({type: "item", item})
    prevCategory = item.category
  }

  return itemOrCategoryList
}

export default function ShoppingListItemsComponent(props: Props) {
  const order = _.find(props.orders, _.matchesProperty('id', props.selectedOrder))
  const completedCategoryOrder = completeCategoryOrder(order ?  order.categoryOrder : [], props.categories)
  const itemOrCategoryList = createItemOrCategoryList(completedCategoryOrder, props.items)

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
      {itemOrCategoryList.map((itemOrCategory) => 
        itemOrCategory.type === "item" 
          ? <EditItemComponent key={itemOrCategory.item.id} item={itemOrCategory.item} categories={props.categories} deleteItem={props.deleteItem} updateItem={props.updateItem} up={props.up}/>
          : <CategoryListItemComponent key={itemOrCategory.categoryId} categoryId={itemOrCategory.categoryId} categories={props.categories}/>
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
