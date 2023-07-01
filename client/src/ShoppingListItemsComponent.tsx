import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import React from 'react'
import FlipMove from 'react-flip-move'
import { CategoryDefinition, CategoryOrder, completeCategoryOrder, Item, Order, sortItems, UUID } from 'shoppinglist-shared'
import { CategoryListItemComponent } from './CategoryComponent'
import styles from './ShoppingListItemsComponent.module.css'
import EditItemComponent from './EditItemComponent'
import { Up } from './HistoryTracker'
import KeyFocusComponent from './KeyFocusComponent'
import OrderSelectComponent from './OrderSelectComponent'
import { DeleteItem, SelectOrder, UpdateItem } from './sync'
import classNames from 'classnames'

interface Props {
  items: readonly Item[]
  categories: readonly CategoryDefinition[]
  orders: readonly Order[]
  selectedOrder: UUID | undefined | null
  selectOrder: SelectOrder
  deleteItem: DeleteItem
  updateItem: UpdateItem
  up: Up
}

type ItemOrCategory =
  | {
      type: 'item'
      item: Item
    }
  | {
      type: 'category'
      categoryId: UUID | undefined | null
    }

function createItemOrCategoryList(order: CategoryOrder, items: readonly Item[]): readonly ItemOrCategory[] {
  const sortedItems = sortItems(items, order)
  const itemOrCategoryList: ItemOrCategory[] = []
  let prevCategory = null

  for (const item of sortedItems) {
    if (item.category !== prevCategory) {
      itemOrCategoryList.push({
        type: 'category',
        categoryId: item.category,
      })
    }

    itemOrCategoryList.push({
      type: 'item',
      item,
    })
    prevCategory = item.category
  }

  return deepFreeze(itemOrCategoryList)
}

export default function ShoppingListItemsComponent(props: Props): JSX.Element {
  const order = _.find(props.orders, _.matchesProperty('id', props.selectedOrder))

  const completedCategoryOrder = completeCategoryOrder(order ? order.categoryOrder : [], props.categories)
  const itemOrCategoryList = createItemOrCategoryList(completedCategoryOrder, props.items)
  const delay = Math.min(10, 100 / props.items.length)
  return (
    <KeyFocusComponent
      direction="vertical"
      rootTagName="ul"
      className={styles['ShoppingListItemsComponent']}
      style={{
        minHeight: `${Math.max(3 * props.items.length + 6, 11)}rem`,
      }}
    >
      <FlipMove
        typeName={null}
        duration="250"
        staggerDurationBy={delay}
        staggerDelayBy={delay}
        enterAnimation="accordionVertical"
        leaveAnimation="accordionVertical"
      >
        {!!props.items.length && !!props.orders.length && (
          <OrderSelectComponent
            key="OrderSelectComponent"
            orders={props.orders}
            selectOrder={props.selectOrder}
            selectedOrder={props.selectedOrder}
          />
        )}
        {itemOrCategoryList.map((itemOrCategory) =>
          itemOrCategory.type === 'item' ? (
            <EditItemComponent
              key={itemOrCategory.item.id}
              item={itemOrCategory.item}
              categories={props.categories}
              deleteItem={props.deleteItem}
              updateItem={props.updateItem}
              up={props.up}
            />
          ) : (
            <CategoryListItemComponent
              key={itemOrCategory.categoryId ?? 'unknown'}
              categoryId={itemOrCategory.categoryId}
              categories={props.categories}
            />
          )
        )}
        {!props.items.length && (
          <div className={styles['ShoppingListItemsComponent__emptyList']}>
            <p>
              Empty list, nothing needed{' '}
              <span role="img" aria-label="Party Popper">
                🎉
              </span>
            </p>
            <p className={classNames(styles['ShoppingListItemsComponent__emptyList__addCallout'], styles['singleCol'])}>
              <span role="img" aria-label="Arrow to entry form">
                ⬇️{' '}
              </span>
              Add some new stuff below
              <span role="img" aria-label="Arrow to entry form">
                {' '}
                ⬇️
              </span>
            </p>
            <p className={classNames(styles['ShoppingListItemsComponent__emptyList__addCallout'], styles['twoCol'])}>
              <span role="img" aria-label="Arrow to entry form">
                ➡️{' '}
              </span>
              Add some new stuff to the right
              <span role="img" aria-label="Arrow to entry form">
                {' '}
                ➡️
              </span>
            </p>
          </div>
        )}
      </FlipMove>
    </KeyFocusComponent>
  )
}
