// @flow
import React from 'react'
import _ from 'lodash'
import { type CategoryDefinition, type UUID, createCategoryDefinition } from 'shoppinglist-shared'
import './CategoryComponent.css'

type Props = {
  category?: CategoryDefinition,
  categories?: $ReadOnlyArray<CategoryDefinition>,
  categoryId?: ?UUID
}


export default function CategoryComponent(props: Props) {
  let category : ?CategoryDefinition
  if (props.category != null) {
    category = props.category
  } else if (props.categories != null && props.categoryId != null){
    category = _.find(props.categories, (category) => category.id === props.categoryId)
  }
  if (category == null) {
    category = createCategoryDefinition({
      "id": "00000000-0000-4000-b000-000000000000",
      "name": "Unknown Category",
      "shortName": "?",
      "color": "#ccc",
      "lightText": false
    })
  }

  const initials = category.shortName
  const style = {
    backgroundColor: category.color,
    color:category.lightText ? '#fff' : '#000'
  }

  return <div className="CategoryComponent" title={category.name}>
    <div className="CategoryComponent__circle" style={style}><span>{initials}</span></div>
  </div>
}
