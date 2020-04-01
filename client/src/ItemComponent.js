// @flow
import _ from 'lodash'
import mathjs from 'mathjs'
import React from 'react'
import classNames from 'classnames'
import { type Amount, type BaseItem } from 'shoppinglist-shared'
import './ItemComponent.css'

type AmountProps = {
  amount: ?Amount,
}

const AmountComponent: React$ComponentType<AmountProps> = React.memo((props: AmountProps) => {
  const amount = props.amount
  if (amount != null) {
    return (
      <span>
        {mathjs.round(amount.value, 2)} {amount.unit != null && <em>{amount.unit}</em>}
      </span>
    )
  } else {
    return null
  }
}, _.isEqual)

type Props = {
  item: BaseItem,
  className?: string,
}

const ItemComponent: React$ComponentType<Props> = React.memo(
  (props: Props) => (
    <span className={classNames('ItemComponent', props.className)}>
      <AmountComponent amount={props.item.amount} /> {props.item.name}
    </span>
  ),
  _.isEqual
)

export default ItemComponent
export { AmountComponent }
