// @flow
import React, { Component } from 'react'
import _ from 'lodash'
import { type Order, type UUID, createUUID } from 'shoppinglist-shared'
import type { SelectOrder } from './ShoppingListContainerComponent'
import './OrderSelectComponent.css'

type Props = {
  orders: $ReadOnlyArray<Order>,
  selectedOrder: ?UUID,
  selectOrder: SelectOrder,
}

export default class OrderSelectComponent extends Component<Props> {
  handleChange = (e: SyntheticEvent<HTMLSelectElement>) => {
    const val = e.currentTarget.value
    if (val == "default") {
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
        <select className="OrderSelectComponent__select KeyFocusComponent--noFocus" value={order != null ? order.id : "default"} onChange={this.handleChange}>
          <option value="default" key="default">Default</option>)
          {
            this.props.orders.map((order) => <option value={order.id} key={order.id}>{order.name}</option>)
          }
        </select>
      </label>
    )
  }
}
