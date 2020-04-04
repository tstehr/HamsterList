import _ from 'lodash'
import React, { Component } from 'react'
import { createUUID, Order, UUID } from 'shoppinglist-shared'
import './OrderSelectComponent.css'
import { SelectOrder } from './ShoppingListContainerComponent'

type Props = {
  orders: ReadonlyArray<Order>
  selectedOrder: UUID | undefined | null
  selectOrder: SelectOrder
}

export default class OrderSelectComponent extends Component<Props> {
  handleChange = (e: React.SyntheticEvent<HTMLSelectElement>) => {
    const val = e.currentTarget.value

    if (val === 'default') {
      this.props.selectOrder(null)
    } else {
      this.props.selectOrder(createUUID(val))
    }
  }

  render() {
    const order = _.find(this.props.orders, _.matchesProperty('id', this.props.selectedOrder))

    return (
      <label className="OrderSelectComponent">
        <span className="OrderSelectComponent__text">Sorting:</span>
        <select
          className="OrderSelectComponent__select KeyFocusComponent--noFocus"
          value={order != null ? order.id : 'default'}
          onChange={this.handleChange}
        >
          <option value="default" key="default">
            Default
          </option>
          )
          {this.props.orders.map((order) => (
            <option value={order.id} key={order.id}>
              {order.name}
            </option>
          ))}
        </select>
      </label>
    )
  }
}
