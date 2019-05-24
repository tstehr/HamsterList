// @flow
import React from 'react'
import { type Item,type CategoryDefinition } from 'shoppinglist-shared'
import ItemComponent from './ItemComponent'
import { CategoryTextComponent } from './CategoryComponent'
import './PillItemComponent.css'

export default function PillItemComponent(props: { item: Item, categories: $ReadOnlyArray<CategoryDefinition> }) {
  return <div className="PillItemComponent">
    <CategoryTextComponent categoryId={props.item.category} categories={props.categories}/> <ItemComponent item={props.item} />
  </div>
}