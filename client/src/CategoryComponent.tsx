import _ from 'lodash'
import React, { Component } from 'react'
import { CategoryDefinition, createCategoryDefinition, UUID } from 'shoppinglist-shared'
import './CategoryComponent.css'

const unknownCategory = createCategoryDefinition({
  id: 'ffffffff-ffff-4fff-bfff-ffffffffffff',
  name: 'Unknown Category',
  shortName: '?',
  color: 'hsl(0, 0%, 80%)',
  lightText: false,
})

const invalidCategory = createCategoryDefinition({
  id: '00000000-0000-4000-b000-000000000000',
  name: 'Invalid Category',
  shortName: `╳`,
  color: 'black',
  lightText: true,
})

interface Props {
  category?: CategoryDefinition
  categories?: readonly CategoryDefinition[]
  categoryId?: UUID | null
}

const CategoryComponent = React.memo((props: Props) => {
  const category = getCategory(props)
  const initials = category.shortName
  const style = {
    backgroundColor: category.color,
    color: category.lightText ? '#fff' : '#000',
  }
  return (
    <div className="CategoryComponent" title={category.name}>
      <div className="CategoryComponent__circle" style={style}>
        <span>{initials}</span>
      </div>
    </div>
  )
}, _.isEqual)

const CategoryTextComponent = React.memo((props: Props) => {
  const category = getCategory(props)

  if (category === unknownCategory) {
    return null
  }

  const initials = category.shortName
  const style = {
    backgroundColor: category.color,
    color: category.lightText ? '#fff' : '#000',
  }
  return (
    <span className="CategoryTextComponent" title={category.name} style={style}>
      {initials}
    </span>
  )
}, _.isEqual)

// needs to be a class to be usable in FlipMove
class CategoryListItemComponent extends Component<Props> {
  render(): JSX.Element {
    const category = getCategory(this.props)
    const style = {
      backgroundColor: category.color,
      color: category.lightText ? '#fff' : '#000',
    }
    return (
      <li className="CategoryListItemComponent" style={style}>
        {category.name}
      </li>
    )
  }
}

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

export default CategoryComponent
export { CategoryTextComponent, CategoryListItemComponent }
