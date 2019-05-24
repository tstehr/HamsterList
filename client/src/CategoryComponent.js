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
  let category = getCategory(props)

  const initials = category.shortName
  const style = {
    backgroundColor: category.color,
    color:category.lightText ? '#fff' : '#000'
  }

  return <div className="CategoryComponent" title={category.name}>
    <div className="CategoryComponent__circle" style={style}><span>{initials}</span></div>
  </div>
}

export function CategoryTextComponent(props: Props) {
  let category = getCategory(props)
  if (category === unknownCategory) {
    return null
  }

  const initials = category.shortName
  const style = {
    backgroundColor: category.color,
    color:category.lightText ? '#fff' : '#000'
  }

  return <span className="CategoryTextComponent" title={category.name} style={style}>{initials}</span>
}

const unknownCategory = createCategoryDefinition({
  "id": "ffffffff-ffff-4fff-bfff-ffffffffffff",
  "name": "Unknown Category",
  "shortName": "?",
  "color": "hsl(0, 0%, 80%)",
  "lightText": false
})

const variantSelector15 = String.fromCharCode(0xfe0e)

const invalidCategory = createCategoryDefinition({
  "id": "00000000-0000-4000-b000-000000000000",
  "name": "Invalid Category",
  "shortName": `╳`,
  "color": "black",
  "lightText": true
})

function getCategory(props: Props): CategoryDefinition {
  if (props.category != null) {
    return props.category
  }
  if (props.categories == null || props.categoryId == null) {
    return unknownCategory
  }

  const category = _.find(props.categories, (category) => category.id === props.categoryId)
  if (category != null) {
    return category
  }

  return invalidCategory
}
