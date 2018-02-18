// @flow
import React, { Component } from 'react'
import { type LocalItem, type CategoryDefinition } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import './CreateItemButtonComponent.css'

type Props = {
  item: LocalItem,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
  focusInput: () => void,
  focused?: boolean,
  noArrowFocus?: boolean,
  onFocus?: (SyntheticFocusEvent<>) => void,
  onBlur?: (SyntheticFocusEvent<>) => void
}

type State = {
  enterPressed: boolean,
}

export default class CreateItemButtonComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      enterPressed: false
    }
  }

  handleClick = (e: SyntheticEvent<>) => {
    this.props.createItem(this.props.item)
    if (this.state.enterPressed) {
      this.props.focusInput()
    }
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter') {
      this.setState({
        enterPressed: true
      })
    }
  }

  handleKeyUp = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter') {
      this.setState({
        enterPressed: false
      })
    }
  }

  render() {
    const props = this.props

    const classes = ["CreateItemButtonComponent"]
    if (props.focused) {
      classes.push("focused")
    }
    if (props.noArrowFocus) {
      classes.push("KeyFocusComponent--noFocus")
    }
    const className = classes.join(" ")

    return <button className={className} onClick={this.handleClick}
        onKeyDown={this.handleKeyDown} onKeyUp={this.handleKeyUp} onFocus={props.onFocus} onBlur={props.onBlur}
      >
      <CategoryComponent categoryId={props.item.category} categories={props.categories}/>
      <div className="CreateItemButtonComponent__name">
        <ItemComponent item={props.item}/>
      </div>
    </button>
  }
}
