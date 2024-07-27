import classNames from 'classnames'
import { isEqual } from 'lodash'
import * as mathjs from 'mathjs'
import React from 'react'
import { Amount, BaseItem } from 'hamsterlist-shared'
import styles from './ItemComponent.module.css'
import Linkify from 'linkify-react'

interface AmountProps {
  amount: Amount | undefined | null
}

const AmountComponent = React.memo(function AmountComponent(props: AmountProps) {
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
}, isEqual)

interface Props {
  item: BaseItem
  className?: string
}

const ItemComponent = React.memo(function ItemComponent(props: Props) {
  return (
    <span className={classNames(styles.ItemComponent, props.className)}>
      <AmountComponent amount={props.item.amount} />{' '}
      <Linkify as="span" options={{ target: '_blank', defaultProtocol: 'https' }}>
        {props.item.name}
      </Linkify>
    </span>
  )
}, isEqual)

export default ItemComponent
export { AmountComponent }
