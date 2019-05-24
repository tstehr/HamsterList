// @flow
import mathjs from 'mathjs'
import React from 'react'
import { type Amount, type BaseItem } from 'shoppinglist-shared'



function AmountComponent(props: {amount: ?Amount}) {
  const amount = props.amount
  if (amount != null) {
    return (
      <span>
        {mathjs.round(amount.value, 2)} {" "}
        {amount.unit != null && <em>{amount.unit}</em>}
      </span>
    )
  } else {
    return null
  }
}

export default function ItemComponent(props: {item: BaseItem}) {
  return (
    <span>
      <AmountComponent amount={props.item.amount} />
      {" "} {props.item.name}
    </span>
  )
}
