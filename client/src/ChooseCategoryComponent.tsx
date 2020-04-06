import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { CategoryDefinition, UUID } from 'shoppinglist-shared'
import CategoryComponent from './CategoryComponent'
import './ChooseCategoryComponent.css'
import KeyFocusComponent from './KeyFocusComponent'

type Props = {
  categories: ReadonlyArray<CategoryDefinition>
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
        <div className="ChooseCategoryComponent" onClick={this.createOnClick(this.props.categoryId)} data-categorycount={count}>
          <KeyFocusComponent direction="vertical" rootTagName="div" className="ChooseCategoryComponent__window">
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
            <button onClick={this.createOnClick(this.props.categoryId)} className="ChooseCategoryComponent__cancel">
              Cancel
            </button>
          </KeyFocusComponent>
        </div>,
        target
      )
    } else {
      return null
    }
  }
}
