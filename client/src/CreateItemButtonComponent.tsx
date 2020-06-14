import classNames from 'classnames'
import React, { Component } from 'react'
import { CategoryDefinition, LocalItem } from 'shoppinglist-shared'
import CategoryComponent from './CategoryComponent'
import './CreateItemButtonComponent.css'
import IconButton from './IconButton'
import ItemComponent from './ItemComponent'
import { CreateItem, DeleteCompletion } from './sync'

interface Props {
  item: LocalItem
  categories: readonly CategoryDefinition[]
  createItem: CreateItem
  deleteCompletion?: DeleteCompletion | null
  focusInput: () => void
  focused?: boolean
  noArrowFocus?: boolean
}

interface State {
  enterPressed: boolean
  altPressed: boolean
  createButtonFocused: boolean
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

  handleClick = (e: React.SyntheticEvent): void => {
    this.props.createItem(this.props.item)

    if (this.state.enterPressed) {
      this.props.focusInput()
    }
  }

  handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.props.deleteCompletion) {
        this.props.deleteCompletion(this.props.item.name)
        e.preventDefault()
        this.props.focusInput()
      }
    } else if (e.key === 'Enter') {
      this.setState({
        enterPressed: true,
      })
    }
  }

  handleKeyUp = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.setState({
        enterPressed: false,
      })
    }
  }

  handleFocus = (e: React.FocusEvent): void => {
    this.setState({
      createButtonFocused: true,
    })
  }

  handleBlur = (e: React.FocusEvent): void => {
    this.setState({
      createButtonFocused: false,
    })
  }

  render(): JSX.Element {
    const props = this.props
    const className = classNames('CreateItemButtonComponent', {
      focused: props.focused ?? this.state.createButtonFocused,
    })
    const buttonClassName = classNames('CreateItemButtonComponent__button', {
      'KeyFocusComponent--noFocus': props.noArrowFocus,
    })
    return (
      <div className={className}>
        <CategoryComponent categoryId={props.item.category} categories={props.categories} />
        <button
          className={buttonClassName}
          onClick={this.handleClick}
          onKeyDown={this.handleKeyDown}
          onKeyUp={this.handleKeyUp}
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
        >
          <ItemComponent item={props.item} />
        </button>
        {this.props.deleteCompletion && (
          <IconButton
            onClick={() => (this.props.deleteCompletion ? this.props.deleteCompletion(this.props.item.name) : undefined)}
            icon="DELETE"
            alt="Delete completion"
            className="KeyFocusComponent--noFocus"
          />
        )}
      </div>
    )
  }
}
