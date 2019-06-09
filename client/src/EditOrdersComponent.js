// @flow
import React, { Component } from 'react'
import _ from 'lodash'
import ReactDOM from 'react-dom'
import { type RouterHistory, type ContextRouter, Route } from 'react-router-dom'
import { SortableContainer, SortableElement, SortableHandle, arrayMove } from 'react-sortable-hoc'
import { Link } from 'react-router-dom';
import { type Order, type UUID, type CategoryDefinition, createRandomUUID, sortCategories } from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import CategoryComponent from './CategoryComponent'
import { type UpdateOrders } from './ShoppingListContainerComponent'
import './EditOrdersComponent.css'


type Props = {
  listid: string,
  orders: $ReadOnlyArray<Order>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  updateOrders: UpdateOrders,
  up: Up,
}

export default class EditOrdersComponent extends Component<Props> {
  updateOrder = (orderToUpdate: Order) => {
    const orders = [...this.props.orders]
    const index = _.findIndex(orders, (order) => order.id === orderToUpdate.id)
    orders[index] = orderToUpdate
    this.props.updateOrders(orders)
  }

  deleteOrder = (id: UUID) => {
      const orders = this.props.orders.filter(order => order.id !== id)
      this.props.updateOrders(orders)
      this.props.up(1)
    }

  makeCreateOrder(history: RouterHistory) {
    return () => {
      const id = createRandomUUID()

      let name = `New Order`
      let i = 1
      const orderPredicate = order => order.name === name
      while (this.props.orders.find(orderPredicate) != null) {
        name = `New Order ${i}`
        i++
      }

      this.props.updateOrders([
        ...this.props.orders,
        {
          id: id,
          name: name,
          categoryOrder: []
        }
      ])
      history.push(`/${this.props.listid}/orders/${id}`)
    }
  }

  handleSortEnd = ({oldIndex, newIndex}: {oldIndex: number, newIndex: number}) => {
    this.props.updateOrders(arrayMove(this.props.orders, oldIndex, newIndex))
  }


  render() {
    const target = document.querySelector('#modal-root')

    if (target != null) {
      return ReactDOM.createPortal(
        (
          <Route render={({history}: ContextRouter) =>
            <div className="EditOrdersComponent"
              onClick={(e: SyntheticEvent<>) => e.target === e.currentTarget && this.props.up('list')}
            >
              <div className="EditOrdersComponent__window">

                <div className="EditOrdersComponent__window__body">
                  <Route path='/:listid/orders/:orderid' render={({history, match}: ContextRouter) =>
                    <div className="EditOrdersComponent__order">
                      <NullSafeEditOrderComponent listid={this.props.listid} orders={this.props.orders} orderid={match.params['orderid']}
                        categories={this.props.categories} updateOrder={this.updateOrder} deleteOrder={this.deleteOrder} up={this.props.up}
                      />
                    </div>
                  }/>

                  <div className="EditOrdersComponent__orders">
                    <SortableOrders orders={this.props.orders} listid={this.props.listid} helperClass="SortableOrder__dragging" lockAxis="y" useDragHandle={true} onSortEnd={this.handleSortEnd}/>

                    <button type="button" className="EditOrdersComponent__orders__new Button Button--padded" aria-label="New Order" onClick={this.makeCreateOrder(history)}>New</button>
                    <button type="button" onClick={() => this.props.up('list')}
                      className="EditOrdersComponent__orders__back Button Button--padded">
                      Back
                    </button>
                  </div>
                </div>

                <div className="EditOrdersComponent__window__footer">
                  <button type="button" className="Button Button--padded" onClick={() => this.props.up('list')}>Back</button>
                </div>

              </div>
            </div>
          }/>
        ), target
      )
    } else {
      return null
    }
  }
}

const SortableOrders = SortableContainer(({ orders, listid }) => {
  return (
    <div>
      {orders.map((order, index) => (
        <SortableOrder key={`item-${index}`} index={index} order={order} listid={listid} />
      ))}
    </div>
  )
})

const SortableOrder = SortableElement(({ order, listid }) =>
  <Link to={`/${listid}/orders/${order.id}`} className="SortableOrder Button">
    <span className="SortableOrder__name">{order.name}</span>
    <DragHandle />
  </Link>
)


type NullSafeEditOrderProps = {
  listid: string,
  orderid: ?string,
  orders: $ReadOnlyArray<Order>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  updateOrder: Order => void,
  deleteOrder: UUID => void,
  up: Up,
}

function NullSafeEditOrderComponent(props: NullSafeEditOrderProps) {
  const order: ?Order = _.find(props.orders, _.matchesProperty('id', props.orderid))

  return (
    <>
    {order != null
      ? <EditOrderComponent listid={props.listid} order={order} categories={props.categories} updateOrder={props.updateOrder} deleteOrder={props.deleteOrder} up={props.up}/>
      : <>
          <p>Not found :(</p>
          <button type="button" className="Button Button--padded" onClick={() => props.up(1)}>Back</button>
        </>
    }
    </>
  )
}

type EditOrderProps = {
  listid: string,
  order: Order,
  categories: $ReadOnlyArray<CategoryDefinition>,
  updateOrder: Order => void,
  deleteOrder: UUID => void,
  up: Up,
}

type EditOrderState = {
  inputValue: string,
  hasFocus: boolean,
}

class EditOrderComponent extends Component<EditOrderProps, EditOrderState> {
  constructor(props: EditOrderProps) {
    super(props)
    this.state = {
      inputValue: props.order.name,
      hasFocus: false,
    }
  }

  componentWillReceiveProps(nextProps: EditOrderProps) {
    this.setState((oldState) => ({
      inputValue: oldState.hasFocus ? oldState.inputValue : nextProps.order.name
    }))
  }

  getSortedCategories() {
    return sortCategories(this.props.categories, this.props.order.categoryOrder)
  }

  handleChange = (e: SyntheticInputEvent<>) => {
    this.setState({inputValue: e.target.value})
  }

  handleFocus = (e: SyntheticEvent<>) => {
    this.setState({
      hasFocus: true,
    })
  }

  handleBlur = (e: SyntheticEvent<>) => {
    this.setState({
      hasFocus: false,
    })
    this.props.updateOrder({
      ...this.props.order,
      name: this.state.inputValue
    })
  }

  handleSortEnd = ({oldIndex, newIndex}) => {
    const categoryOrder = this.getSortedCategories().map(cat => cat.id)
    this.props.updateOrder({
      ...this.props.order,
      categoryOrder: arrayMove(categoryOrder, oldIndex, newIndex),
    })
  }

  render() {
    const sortedCategories = this.getSortedCategories()

    return (
      <div>
        <input type="text" className="EditOrderComponent__name" value={this.state.inputValue} onChange={this.handleChange} onFocus={this.handleFocus} onBlur={this.handleBlur} />

        <SortableCategories categories={sortedCategories} helperClass="SortableCategory__dragging" lockAxis="y" onSortEnd={this.handleSortEnd} useDragHandle={true} />

        <button type="button" onClick={() => this.props.deleteOrder(this.props.order.id)} className="EditOrderComponent__delete Button Button--padded">Delete</button>

        <button type="button" className="EditOrderComponent__back Button Button--padded" onClick={() => this.props.up(1)}>Back</button>
      </div>
    )
  }
}

const SortableCategories = SortableContainer(({ categories }) => {
  return (
    <div>
      {categories.map((category, index) => (
        <SortableCategory key={`item-${index}`} index={index} category={category} />
      ))}
    </div>
  )
})

const SortableCategory = SortableElement(({ category }) =>
  <div className="SortableCategory Button">
    <CategoryComponent category={category} />
    <span className="SortableCategory__name">{category.name}</span>
    <DragHandle />
  </div>
)

const DragHandle = SortableHandle(() => <span className="DragHandle">≡</span>)
