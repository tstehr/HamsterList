import classNames from 'classnames'
import _, { isEqual } from 'lodash'
import React, { Component, ComponentProps, PropsWithChildren } from 'react'
import { CategoryDefinition, createCategoryDefinition, UUID } from 'hamsterlist-shared'
import styles from './CategoryComponent.module.css'

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

type Props = PropsWithChildren<{
  category?: CategoryDefinition
  categories?: readonly CategoryDefinition[]
  categoryId?: UUID | null
}>

const CategoryComponent = React.memo(
  React.forwardRef<HTMLDivElement, Props & ComponentProps<'div'>>((props, ref) => {
    const category = getCategory(props)
    const initials = category.shortName
    const style = {
      backgroundColor: category.color,
      color: category.lightText ? '#fff' : '#000',
    }
    return (
      <div
        className={classNames(styles.CategoryComponent, props.className)}
        title={category.name}
        ref={ref}
        {..._.omit(props, 'className', 'category', 'categories', 'categoryId')}
      >
        <div className={styles.Circle} style={style}>
          {props.children ? props.children : <span>{initials}</span>}
        </div>
      </div>
    )
  }),
  isEqual,
)

// eslint-disable-next-line react/display-name
const CategoryTextComponent = React.memo((props: Props & ComponentProps<'span'>) => {
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
    <span
      className={classNames(styles.CategoryTextComponent, props.className)}
      title={category.name}
      style={style}
      {..._.omit(props, 'className', 'category', 'categories', 'categoryId')}
    >
      {initials}
    </span>
  )
}, isEqual)

// needs to be a class to be usable in FlipMove
class CategoryListItemComponent extends Component<Props> {
  render(): JSX.Element {
    const category = getCategory(this.props)
    const style = {
      backgroundColor: category.color,
      color: category.lightText ? '#fff' : '#000',
    }
    return (
      <li className={styles.CategoryListItemComponent} style={style}>
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
export { CategoryListItemComponent, CategoryTextComponent }
