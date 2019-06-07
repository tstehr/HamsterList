// @flow
import React, { Component } from 'react'
import classNames from 'classnames'
import { type LocalItem, type CategoryDefinition } from 'shoppinglist-shared'
import type { CreateItem, DeleteCompletion } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import IconButton from './IconButton'
import './CreateItemButtonComponent.css'

type Props = {
  item: LocalItem,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
  deleteCompletion?: ?DeleteCompletion,
  focusInput: () => void,
  focused?: boolean,
  noArrowFocus?: boolean,
}

type State = {
  enterPressed: boolean,
  altPressed: boolean,
  createButtonFocused: boolean,
}

export default class CreateItemButtonComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      enterPressed: false,
      altPressed: false,
      createButtonFocused: false,
    }
  }

  handleClick = (e: SyntheticEvent<>) => {
    this.props.createItem(this.props.item)
    if (this.state.enterPressed) {
      this.props.focusInput()
    }
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.props.deleteCompletion) {
        this.props.deleteCompletion(this.props.item.name)
        e.preventDefault()
        this.props.focusInput()
      } 
    } else if (e.key === 'Enter') {
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

  handleFocus = (e: SyntheticFocusEvent<>) => {
    this.setState({
      createButtonFocused: true
    })
  }

  handleBlur = (e: SyntheticFocusEvent<>) => {
    this.setState({
      createButtonFocused: false
    })
  }

  render() {
    const props = this.props

    const className = classNames("CreateItemButtonComponent", {
      "focused": props.focused || this.state.createButtonFocused,
    })

    const buttonClassName = classNames("CreateItemButtonComponent__button", {
      "KeyFocusComponent--noFocus": props.noArrowFocus,
    })

    return <div className={className}>
      <CategoryComponent categoryId={props.item.category} categories={props.categories}/>
      <button className={buttonClassName} onClick={this.handleClick} onKeyDown={this.handleKeyDown} onKeyUp={this.handleKeyUp} onFocus={this.handleFocus} onBlur={this.handleBlur}>
        <ItemComponent item={props.item}/>
      </button>
      {this.props.deleteCompletion && 
        <IconButton onClick={() => !!this.props.deleteCompletion ? this.props.deleteCompletion(this.props.item.name) : undefined
        } 
          icon="DELETE" alt="Delete completion" className="KeyFocusComponent--noFocus"/>
      }
    </div>
  }
}
