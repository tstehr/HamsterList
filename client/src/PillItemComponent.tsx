import { isEqual } from 'lodash'
import React from 'react'
import { CategoryDefinition, Item } from 'hamsterlist-shared'
import { CategoryTextComponent } from './CategoryComponent'
import ItemComponent from './ItemComponent'
import styles from './PillItemComponent.module.css'

interface Props {
  item: Item
  categories: readonly CategoryDefinition[]
}

const PillItemComponent = React.memo(function PillItemComponent(props: Props) {
  return (
    <div className={styles.PillItemComponent}>
      <CategoryTextComponent
        categoryId={props.item.category}
        categories={props.categories}
        className={styles.CategoryTextComponent}
      />{' '}
      <ItemComponent item={props.item} className={styles.Item} />
    </div>
  )
}, isEqual)

export default PillItemComponent
