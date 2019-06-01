// @flow
import _ from 'lodash'

import React from 'react'
import { type Item,type CategoryDefinition } from 'shoppinglist-shared'
import ItemComponent from './ItemComponent'
import { CategoryTextComponent } from './CategoryComponent'
import './PillItemComponent.css'

type Props = { 
  item: Item, categories: $ReadOnlyArray<CategoryDefinition> 
}

const PillItemComponent: React$ComponentType<Props> = React.memo((props: Props) => (
  <div className="PillItemComponent">
    <CategoryTextComponent categoryId={props.item.category} categories={props.categories}/> <ItemComponent item={props.item} />
  </div>
), _.isEqual)

export default PillItemComponent