import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { CategoryDefinition, UUID } from 'hamsterlist-shared'
import CategoryComponent from './CategoryComponent'
import styles from './ChooseCategoryComponent.module.css'
import KeyFocusComponent from './KeyFocusComponent'

interface Props {
  categories: readonly CategoryDefinition[]
  categoryId: UUID | undefined | null
  updateCategory: (a?: UUID | null) => void
}

export default class ChooseCategoryComponent extends Component<Props> {
  createOnClick(categoryId?: UUID | null) {
    return (e: React.SyntheticEvent) => {
      this.props.updateCategory(categoryId)
      e.preventDefault()
      e.stopPropagation()
    }
  }

  render(): JSX.Element | null {
    const target = document.querySelector('#modal-root')

    if (target != null) {
      const count = Math.ceil((this.props.categories.length + 1) / 10) * 10
      return ReactDOM.createPortal(
        <div
          className={styles.ChooseCategoryComponent}
          onClick={this.createOnClick(this.props.categoryId)}
          data-categorycount={count}
        >
          <KeyFocusComponent direction="vertical" rootTagName="div" className={styles.Window}>
            {this.props.categories.map((category) => (
              <button type="button" key={category.id} onClick={this.createOnClick(category.id)}>
                <CategoryComponent category={category} />
                <div>{category.name}</div>
              </button>
            ))}
            <button type="button" key="undefined" onClick={this.createOnClick(null)}>
              <CategoryComponent categoryId={null} />
              <div>Remove category</div>
            </button>
            <button onClick={this.createOnClick(this.props.categoryId)} className={styles.Cancel}>
              Cancel
            </button>
          </KeyFocusComponent>
        </div>,
        target,
      )
    } else {
      return null
    }
  }
}
