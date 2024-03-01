import classNames from 'classnames'
import { KEY_FOCUS_COMPONENT_NO_FOCUS } from 'KeyFocusComponent'
import _ from 'lodash'
import React, { Component } from 'react'
import { createUUID, Order, UUID } from 'shoppinglist-shared'
import styles from './OrderSelectComponent.module.css'
import { SelectOrder } from './sync'

interface Props {
  orders: readonly Order[]
  selectedOrder: UUID | undefined | null
  selectOrder: SelectOrder
}

export default class OrderSelectComponent extends Component<Props> {
  handleChange = (e: React.SyntheticEvent<HTMLSelectElement>): void => {
    const val = e.currentTarget.value

    if (val === 'default') {
      this.props.selectOrder(null)
    } else {
      this.props.selectOrder(createUUID(val))
    }
  }

  render(): JSX.Element {
    const order = _.find(this.props.orders, _.matchesProperty('id', this.props.selectedOrder))

    return (
      <label className={styles['OrderSelectComponent']}>
        <span className={styles['Text']}>Sorting:</span>
        <select
          className={classNames(styles['Select'], KEY_FOCUS_COMPONENT_NO_FOCUS)}
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
