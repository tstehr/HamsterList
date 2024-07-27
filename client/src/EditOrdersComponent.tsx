import classNames from 'classnames'
import { History } from 'history'
import IconButton from 'IconButton'
import _ from 'lodash'
import React, { Component, useEffect, useRef, useState } from 'react'
import { ChromePicker, ColorResult, RGBColor } from 'react-color'
import { Link, Route, RouteComponentProps } from 'react-router-dom'
import { arrayMove, SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc'
import { CategoryDefinition, createRandomUUID, Order, sortCategories, UUID } from 'hamsterlist-shared'
import CategoryComponent from './CategoryComponent'
import styles from './EditOrdersComponent.module.css'
import { Up } from './HistoryTracker'
import globalStyles from './index.module.css'
import { UpdateCategories, UpdateOrders } from './sync'

interface Props {
  listid: string
  orders: readonly Order[]
  categories: readonly CategoryDefinition[]
  updateCategories: UpdateCategories
  updateOrders: UpdateOrders
  up: Up
}

type UpdateOrder = (o: Order) => void
type DeleteOrder = (id: UUID) => void

type UpdateCategory = (c: CategoryDefinition) => void
type DeleteCategory = (id: UUID) => void

export default class EditOrdersComponent extends Component<Props> {
  updateOrder = (orderToUpdate: Order): void => {
    const orders = [...this.props.orders]

    const index = _.findIndex(orders, (order) => order.id === orderToUpdate.id)

    orders[index] = orderToUpdate
    this.props.updateOrders(orders)
  }

  deleteOrder = (id: UUID): void => {
    const orders = this.props.orders.filter((order) => order.id !== id)
    this.props.updateOrders(orders)
  }

  makeCreateOrder(history: History) {
    return (): void => {
      const id = createRandomUUID()
      let name = `New Order`
      let i = 1

      const orderPredicate = (order: Order): boolean => order.name === name

      while (this.props.orders.find(orderPredicate) != null) {
        name = `New Order ${i}`
        i++
      }

      this.props.updateOrders([
        ...this.props.orders,
        {
          id: id,
          name: name,
          categoryOrder: [],
        },
      ])
      history.push(`/${this.props.listid}/orders/${id}`)
    }
  }

  handleSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }): void => {
    this.props.updateOrders(arrayMove(this.props.orders as Order[], oldIndex, newIndex))
  }

  render(): JSX.Element {
    return (
      <Route
        render={({ history }: RouteComponentProps) => (
          <div className={styles.EditOrdersComponent}>
            <Route
              path="/:listid/orders/:orderid"
              render={({ match }: RouteComponentProps<{ orderid: string }>) => (
                <div className={styles.Order}>
                  <NullSafeEditOrderComponent
                    listid={this.props.listid}
                    orders={this.props.orders}
                    orderid={match.params.orderid}
                    categories={this.props.categories}
                    updateCategories={this.props.updateCategories}
                    updateOrder={this.updateOrder}
                    deleteOrder={this.deleteOrder}
                    up={this.props.up}
                  />
                </div>
              )}
            />

            <div className={styles.Orders}>
              <Link
                to={`/${this.props.listid}/orders/categories`}
                className={classNames(globalStyles.Button, globalStyles.padded)}
              >
                <i>Default</i>
              </Link>

              <SortableOrders
                orders={this.props.orders}
                listid={this.props.listid}
                helperClass={classNames(styles.SortableOrder, styles.dragging)}
                lockAxis="y"
                useDragHandle={true}
                onSortEnd={this.handleSortEnd}
                deleteOrder={this.deleteOrder}
              />

              <button
                type="button"
                className={classNames(styles.New, globalStyles.Button, globalStyles.padded)}
                aria-label="New Order"
                onClick={this.makeCreateOrder(history)}
              >
                New
              </button>
            </div>
          </div>
        )}
      />
    )
  }
}

const SortableOrders = SortableContainer(
  ({ orders, listid, deleteOrder }: { orders: readonly Order[]; listid: string; deleteOrder: DeleteOrder }) => {
    return (
      <div>
        {orders.map((order, index) => (
          <SortableOrder key={`item-${index}`} index={index} order={order} listid={listid} deleteOrder={deleteOrder} />
        ))}
      </div>
    )
  },
)

const SortableOrder = SortableElement(
  ({ order, listid, deleteOrder }: { order: Order; listid: string; deleteOrder: DeleteOrder }) => {
    function handleDelete(e: React.SyntheticEvent<HTMLButtonElement>): void {
      e.preventDefault()
      if (window.confirm(`Really delete order "${order.name}"?`)) {
        deleteOrder(order.id)
      }
    }

    return (
      <Link to={`/${listid}/orders/${order.id}`} className={classNames(styles.SortableOrder, globalStyles.Button)}>
        <span className={styles.SortableOrderName}>{order.name}</span>
        <IconButton onClick={handleDelete} icon="DELETE" alt="Delete" className={styles.SortableOrderDelete} />
        <DragHandle />
      </Link>
    )
  },
)

interface NullSafeEditOrderProps {
  listid: string
  orderid: string | undefined | null
  orders: readonly Order[]
  categories: readonly CategoryDefinition[]
  updateCategories: UpdateCategories
  updateOrder: UpdateOrder
  deleteOrder: DeleteOrder
  up: Up
}

function NullSafeEditOrderComponent(props: NullSafeEditOrderProps): JSX.Element {
  const order: Order | undefined | null = _.find(props.orders, _.matchesProperty('id', props.orderid))

  return (
    <>
      {props.orderid === 'categories' ? (
        <EditOrderComponent
          listid={props.listid}
          order={null}
          categories={props.categories}
          updateCategories={props.updateCategories}
          updateOrder={props.updateOrder}
          up={props.up}
        />
      ) : order != null ? (
        <EditOrderComponent
          listid={props.listid}
          order={order}
          categories={props.categories}
          updateCategories={props.updateCategories}
          updateOrder={props.updateOrder}
          up={props.up}
        />
      ) : (
        <>
          <p>Not found :(</p>
          <button type="button" className={classNames(globalStyles.Button, globalStyles.padded)} onClick={() => props.up(1)}>
            Back
          </button>
        </>
      )}
    </>
  )
}

interface EditOrderProps {
  listid: string
  order: Order | null
  categories: readonly CategoryDefinition[]
  updateCategories: UpdateCategories
  updateOrder: (a: Order) => void
  up: Up
}
interface EditOrderState {
  inputValue: string
  hasFocus: boolean
}

class EditOrderComponent extends Component<EditOrderProps, EditOrderState> {
  constructor(props: EditOrderProps) {
    super(props)
    this.state = {
      inputValue: props.order?.name ?? '',
      hasFocus: false,
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: EditOrderProps): void {
    this.setState((oldState) => ({
      inputValue: oldState.hasFocus ? oldState.inputValue : nextProps.order?.name ?? '',
    }))
  }

  getSortedCategories(): readonly CategoryDefinition[] {
    if (!this.props.order) {
      return this.props.categories
    }
    return sortCategories(this.props.categories, this.props.order.categoryOrder)
  }

  handleChange = (e: React.FormEvent<HTMLInputElement>): void => {
    this.setState({
      inputValue: e.currentTarget.value,
    })
  }

  handleFocus = (): void => {
    this.setState({
      hasFocus: true,
    })
  }

  handleBlur = (): void => {
    this.setState({
      hasFocus: false,
    })
    const order = this.props.order
    if (order) {
      this.props.updateOrder({ ...order, name: this.state.inputValue })
    }
  }

  handleSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }): void => {
    if (this.props.order) {
      const categoryOrder = this.getSortedCategories().map((cat) => cat.id)
      this.props.updateOrder({ ...this.props.order, categoryOrder: arrayMove(categoryOrder, oldIndex, newIndex) })
    } else {
      this.props.updateCategories(arrayMove([...this.getSortedCategories()], oldIndex, newIndex))
    }
  }

  handleDeleteAll = (): void => {
    if (window.confirm(`Really delete category all categories? This can not be undone!`)) {
      this.deleteAllCategories()
    }
  }

  createCategory = (): void => {
    const id = createRandomUUID()
    let name = `New Category`
    let i = 1

    const categoryPredicate = (category: CategoryDefinition): boolean => category.name === name

    while (this.props.categories.find(categoryPredicate) != null) {
      name = `New Category ${i}`
      i++
    }

    this.props.updateCategories([
      ...this.props.categories,
      {
        id: id,
        name: name,
        shortName: 'NEW',
        color: 'hsl(0, 0%, 50%)',
        lightText: false,
      },
    ])
  }

  updateCategory = (categoryToUpdate: CategoryDefinition): void => {
    const categories = [...this.props.categories]

    const index = _.findIndex(categories, (category) => category.id === categoryToUpdate.id)

    categories[index] = categoryToUpdate
    this.props.updateCategories(categories)
  }

  deleteCategory = (id: UUID): void => {
    const categories = [...this.props.categories]
    const index = _.findIndex(categories, (category) => category.id === id)
    categories.splice(index, 1)
    this.props.updateCategories(categories)
  }

  deleteAllCategories = (): void => {
    this.props.updateCategories([])
  }

  render(): JSX.Element {
    const sortedCategories = this.getSortedCategories()
    const order = this.props.order
    return (
      <div>
        {order ? (
          <input
            type="text"
            className={styles.Name}
            value={this.state.inputValue}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />
        ) : (
          <div className={styles.Name}>
            <i>Default</i>
          </div>
        )}

        <SortableCategories
          categories={sortedCategories}
          helperClass={classNames(styles.SortableCategory, styles.dragging)}
          lockAxis="y"
          onSortEnd={this.handleSortEnd}
          useDragHandle={true}
          updateCategory={this.updateCategory}
          deleteCategory={this.deleteCategory}
        />
        <button
          type="button"
          className={classNames(styles.New, globalStyles.Button, globalStyles.padded)}
          aria-label="New Category"
          onClick={this.createCategory}
        >
          New
        </button>
        <button
          type="button"
          className={classNames(styles.Delete, globalStyles.Button, globalStyles.padded)}
          aria-label="Delete all categories"
          onClick={this.handleDeleteAll}
        >
          Delete all categories
        </button>
        <button
          type="button"
          className={classNames(styles.Back, globalStyles.Button, globalStyles.padded)}
          onClick={() => this.props.up(1)}
        >
          Back
        </button>
      </div>
    )
  }
}

const SortableCategories = SortableContainer(
  ({
    categories,
    updateCategory,
    deleteCategory,
  }: {
    categories: readonly CategoryDefinition[]
    updateCategory: UpdateCategory
    deleteCategory: DeleteCategory
  }) => {
    return (
      <div>
        {categories.map((category, index) => (
          <SortableCategory
            key={category.id}
            index={index}
            category={category}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
          />
        ))}
      </div>
    )
  },
)

const SortableCategory = SortableElement(
  ({
    category,
    updateCategory,
    deleteCategory,
  }: {
    category: CategoryDefinition
    updateCategory: UpdateCategory
    deleteCategory: DeleteCategory
  }) => {
    const categoryComponentRef = useRef<HTMLDivElement>(null)

    const [showPicker, setShowPicker] = useState(false)
    useEffect(() => {
      function handleOutsideClick(e: MouseEvent): void {
        if (showPicker && categoryComponentRef.current && !categoryComponentRef.current.contains(e.target as Node)) {
          e.preventDefault()
          e.stopImmediatePropagation()
          setShowPicker(false)
        }
      }
      if (showPicker) {
        window.addEventListener('click', handleOutsideClick, true)
        return () => {
          window.removeEventListener('click', handleOutsideClick, true)
        }
      }
    }, [showPicker])

    function handleColorChange({ hsl, rgb }: ColorResult): void {
      updateCategory({
        ...category,
        color: `hsl(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%)`,
        lightText: brightness(rgb) < 0.5,
      })
    }

    const [shortNameInputValue, setShortNameInputValue] = useState<string>()
    function handleShortNameChange(e: React.FormEvent<HTMLInputElement>): void {
      setShortNameInputValue(e.currentTarget.value)
      updateCategory({
        ...category,
        shortName: e.currentTarget.value,
      })
    }

    const [nameInputValue, setNameInputValue] = useState<string>()
    function handleNameChange(e: React.FormEvent<HTMLInputElement>): void {
      setNameInputValue(e.currentTarget.value)
      updateCategory({
        ...category,
        name: e.currentTarget.value,
      })
    }
    function handleDelete(): void {
      if (window.confirm(`Really delete category "${category.name}"?`)) {
        deleteCategory(category.id)
      }
    }

    return (
      <div
        className={classNames(styles.SortableCategory, globalStyles.Button, {
          [styles.colorPickerOpen]: showPicker,
        })}
      >
        <CategoryComponent category={category} className={styles.SortableCategoryIcon} ref={categoryComponentRef}>
          <input
            type="text"
            className={styles.SortableCategoryIconInput}
            value={shortNameInputValue ?? category.shortName}
            onChange={handleShortNameChange}
            onFocus={() => setShowPicker(true)}
            onBlur={() => setShortNameInputValue(undefined)}
          />
          {showPicker && (
            <div className={styles.ColorPickerContainer}>
              <ChromePicker color={category.color} onChange={handleColorChange} disableAlpha={true} />
            </div>
          )}
        </CategoryComponent>
        <input
          type="text"
          className={styles.SortableCategoryName}
          value={nameInputValue ?? category.name}
          onChange={handleNameChange}
          onBlur={() => setNameInputValue(undefined)}
        />
        <IconButton onClick={handleDelete} icon="DELETE" alt="Delete" className={styles.SortableCategoryDelete} />
        <DragHandle />
      </div>
    )
  },
)

const DragHandle = SortableHandle(() => (
  <div className={styles.DragHandle}>
    <svg version="1.1" width="24" height="24" viewBox="0 0 24 24">
      <path d="M21 11H3V9H21V11M21 13H3V15H21V13Z" />
    </svg>
  </div>
))

function brightness(c: RGBColor): number {
  return Math.sqrt(Math.pow(c.r, 2) * 0.241 + Math.pow(c.g, 2) * 0.691 + Math.pow(c.b, 2) * 0.068) / 255
}
