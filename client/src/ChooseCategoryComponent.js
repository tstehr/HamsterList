// @flow
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { type CategoryDefinition, type UUID } from 'shoppinglist-shared'
import CategoryComponent from './CategoryComponent'
import KeyFocusComponent from './KeyFocusComponent'
import './ChooseCategoryComponent.css'

type Props = {
  categories: $ReadOnlyArray<CategoryDefinition>,
  categoryId: ?UUID,
  updateCategory: (?UUID) => void
}

export default class ChooseCategoryComponent extends Component<Props> {
  createOnClick(categoryId: ?UUID) {
    return (e: SyntheticEvent<>) => {
      this.props.updateCategory(categoryId)
      e.preventDefault()
      e.stopPropagation()
    }
  }

  render() {
    const target = document.querySelector('#modal-root')

    if (target != null) {
      return ReactDOM.createPortal(
        (
          <div className="ChooseCategoryComponent" onClick={this.createOnClick(this.props.categoryId)}>
            <div className="ChooseCategoryComponent__window">
              <KeyFocusComponent direction="vertical" rootTagName="div">
                {
                  this.props.categories.map((category) => (
                    <button type="button" key={category.id} onClick={this.createOnClick(category.id)}>
                      <CategoryComponent category={category} /> {category.name}
                    </button>
                  ))
                }
                <button type="button" key="undefined"  onClick={this.createOnClick(null)}>
                  <CategoryComponent /> Remove category
                </button>
                <a href="#" onClick={this.createOnClick(this.props.categoryId)}>Cancel</a>
              </KeyFocusComponent>
            </div>
          </div>
        ), target
      )
    } else {
      return null
    }
  }
}
