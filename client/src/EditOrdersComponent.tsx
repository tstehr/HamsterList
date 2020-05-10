import { History } from 'history'
import _ from 'lodash'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { Link, Route, RouteComponentProps } from 'react-router-dom'
import { arrayMove, SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc'
import { CategoryDefinition, createRandomUUID, Order, sortCategories, UUID } from 'shoppinglist-shared'
import CategoryComponent from './CategoryComponent'
import './EditOrdersComponent.css'
import { Up } from './HistoryTracker'
import { UpdateCategories, UpdateOrders } from './ShoppingListContainerComponent'

interface Props {
  listid: string
  orders: readonly Order[]
  categories: readonly CategoryDefinition[]
  updateCategories: UpdateCategories
  updateOrders: UpdateOrders
  up: Up
}

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
    this.props.up(1)
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

  render(): JSX.Element | null {
    const target = document.querySelector('#modal-root')

    if (target != null) {
      return ReactDOM.createPortal(
        <Route
          render={({ history }: RouteComponentProps) => (
            <div
              className="EditOrdersComponent"
              onClick={(e: React.SyntheticEvent) => e.target === e.currentTarget && this.props.up('list')}
            >
              <div className="EditOrdersComponent__window">
                <div className="EditOrdersComponent__window__body">
                  <Route
                    path="/:listid/orders/:orderid"
                    render={({ history, match }: RouteComponentProps<{ orderid: string }>) => (
                      <div className="EditOrdersComponent__order">
                        <NullSafeEditOrderComponent
                          listid={this.props.listid}
                          orders={this.props.orders}
                          orderid={match.params['orderid']}
                          categories={this.props.categories}
                          updateCategories={this.props.updateCategories}
                          updateOrder={this.updateOrder}
                          deleteOrder={this.deleteOrder}
                          up={this.props.up}
                        />
                      </div>
                    )}
                  />

                  <div className="EditOrdersComponent__orders">
                    <Link to={`/${this.props.listid}/orders/categories`} className="Button Button--padded">
                      <i>Default</i>
                    </Link>

                    <SortableOrders
                      orders={this.props.orders}
                      listid={this.props.listid}
                      helperClass="SortableOrder__dragging"
                      lockAxis="y"
                      useDragHandle={true}
                      onSortEnd={this.handleSortEnd}
                    />

                    <button
                      type="button"
                      className="EditOrdersComponent__orders__new Button Button--padded"
                      aria-label="New Order"
                      onClick={this.makeCreateOrder(history)}
                    >
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => this.props.up('list')}
                      className="EditOrdersComponent__orders__back Button Button--padded"
                    >
                      Back
                    </button>
                  </div>
                </div>

                <div className="EditOrdersComponent__window__footer">
                  <button type="button" className="Button Button--padded" onClick={() => this.props.up('list')}>
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        />,
        target
      )
    } else {
      return null
    }
  }
}

const SortableOrders = SortableContainer(({ orders, listid }: { orders: readonly Order[]; listid: string }) => {
  return (
    <div>
      {orders.map((order, index) => (
        <SortableOrder key={`item-${index}`} index={index} order={order} listid={listid} />
      ))}
    </div>
  )
})

const SortableOrder = SortableElement(({ order, listid }: { order: Order; listid: string }) => (
  <Link to={`/${listid}/orders/${order.id}`} className="SortableOrder Button">
    <span className="SortableOrder__name">{order.name}</span>
    <DragHandle />
  </Link>
))

interface NullSafeEditOrderProps {
  listid: string
  orderid: string | undefined | null
  orders: readonly Order[]
  categories: readonly CategoryDefinition[]
  updateCategories: UpdateCategories
  updateOrder: (a: Order) => void
  deleteOrder: (a: UUID) => void
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
          deleteOrder={props.deleteOrder}
          up={props.up}
        />
      ) : order != null ? (
        <EditOrderComponent
          listid={props.listid}
          order={order}
          categories={props.categories}
          updateCategories={props.updateCategories}
          updateOrder={props.updateOrder}
          deleteOrder={props.deleteOrder}
          up={props.up}
        />
      ) : (
        <>
          <p>Not found :(</p>
          <button type="button" className="Button Button--padded" onClick={() => props.up(1)}>
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
  deleteOrder: (a: UUID) => void
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

  componentWillReceiveProps(nextProps: EditOrderProps): void {
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

  handleFocus = (e: React.SyntheticEvent): void => {
    this.setState({
      hasFocus: true,
    })
  }

  handleBlur = (e: React.SyntheticEvent): void => {
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

  render(): JSX.Element {
    const sortedCategories = this.getSortedCategories()
    const order = this.props.order
    return (
      <div>
        {order ? (
          <input
            type="text"
            className="EditOrderComponent__name"
            value={this.state.inputValue}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />
        ) : (
          <div className="EditOrderComponent__name">
            <i>Default</i>
          </div>
        )}

        <SortableCategories
          categories={sortedCategories}
          helperClass="SortableCategory__dragging"
          lockAxis="y"
          onSortEnd={this.handleSortEnd}
          useDragHandle={true}
        />
        {order && (
          <button
            type="button"
            onClick={() => this.props.deleteOrder(order.id)}
            className="EditOrderComponent__delete Button Button--padded"
          >
            Delete
          </button>
        )}
        <button type="button" className="EditOrderComponent__back Button Button--padded" onClick={() => this.props.up(1)}>
          Back
        </button>
      </div>
    )
  }
}

const SortableCategories = SortableContainer(({ categories }: { categories: readonly CategoryDefinition[] }) => {
  return (
    <div>
      {categories.map((category, index) => (
        <SortableCategory key={`item-${index}`} index={index} category={category} />
      ))}
    </div>
  )
})
const SortableCategory = SortableElement(({ category }: { category: CategoryDefinition }) => (
  <div className="SortableCategory Button">
    <CategoryComponent category={category} />
    <span className="SortableCategory__name">{category.name}</span>
    <DragHandle />
  </div>
))
const DragHandle = SortableHandle(() => (
  <div className="DragHandle">
    <svg version="1.1" width="24" height="24" viewBox="0 0 24 24">
      <path d="M21 11H3V9H21V11M21 13H3V15H21V13Z" />
    </svg>
  </div>
))
