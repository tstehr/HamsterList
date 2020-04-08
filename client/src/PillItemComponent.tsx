import { isEqual } from 'lodash'
import React from 'react'
import { CategoryDefinition, Item } from 'shoppinglist-shared'
import { CategoryTextComponent } from './CategoryComponent'
import ItemComponent from './ItemComponent'
import './PillItemComponent.css'

interface Props {
  item: Item
  categories: readonly CategoryDefinition[]
}

const PillItemComponent = React.memo(
  (props: Props) => (
    <div className="PillItemComponent">
      <CategoryTextComponent categoryId={props.item.category} categories={props.categories} />{' '}
      <ItemComponent item={props.item} className="PillItemComponent__item" />
    </div>
  ),
  isEqual
)

export default PillItemComponent
