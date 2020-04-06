import _ from 'lodash'
import React, { Component } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import { Route } from 'react-router-dom'
import { CategoryDefinition, createLocalItemFromString, Item, itemToString, LocalItem } from 'shoppinglist-shared'
import CategoryComponent from './CategoryComponent'
import './EditItemComponent.css'
import { Up } from './HistoryTracker'
import IconButton from './IconButton'
import ItemComponent from './ItemComponent'
import { DeleteItem, UpdateItem } from './ShoppingListContainerComponent'

type Props = {
  item: Item
  categories: ReadonlyArray<CategoryDefinition>
  deleteItem: DeleteItem
  updateItem: UpdateItem
  up: Up
}

type State = {
  hasFocus: boolean
  isEditing: boolean
  inputValue: string
}

export default class EditItemComponent extends Component<Props, State> {
  input: HTMLTextAreaElement | undefined | null
  itemDiv: HTMLDivElement | undefined | null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false,
      isEditing: false,
      inputValue: '',
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return !_.isEqual(this.state, nextState) || !_.isEqual(this.props.item, nextProps.item)
  }

  saveItem(): void {
    const itemFromString: LocalItem = createLocalItemFromString(this.state.inputValue, this.props.categories)
    const updatedItem: LocalItem = { ...itemFromString, category: itemFromString.category || this.props.item.category }
    this.props.updateItem(this.props.item.id, updatedItem)
  }

  handleFocus = (): void => {
    this.setState((prevState) => ({
      hasFocus: true,
      isEditing: prevState.hasFocus ? false : true,
      inputValue: itemToString(this.props.item),
    }))
  }

  handleBlur = (): void => {
    this.saveItem()
    this.setState({
      hasFocus: false,
      isEditing: false,
    })
  }

  handleSumbit = (e: React.SyntheticEvent): void => {
    this.saveItem()
    this.setState({
      isEditing: false,
    })
    e.preventDefault()
  }

  handleInputKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.saveItem()
      this.setState({
        isEditing: false,
      })
      e.preventDefault()
    }

    if (e.key === 'Escape') {
      this.setState({
        isEditing: false,
        inputValue: itemToString(this.props.item),
      })
      e.preventDefault()
    }
  }

  handleChange = (e: React.FormEvent<HTMLTextAreaElement>): void => {
    this.setState({
      inputValue: e.currentTarget.value,
    })
  }

  handleDivKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.setState({
        hasFocus: true,
        isEditing: true,
        inputValue: itemToString(this.props.item),
      })
      e.preventDefault()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      this.props.deleteItem(this.props.item.id)
      e.preventDefault()
    }
  }

  handleDivClick = (e: React.SyntheticEvent): void => {
    this.setState({
      hasFocus: true,
      isEditing: true,
      inputValue: itemToString(this.props.item),
    })
  }

  render(): JSX.Element {
    return (
      <li className="EditItemComponent">
        <Route
          render={({ history, location, match }) => (
            <button
              type="button"
              className="EditItemComponent__category KeyFocusComponent--noFocus"
              onClick={() => history.push(`/${match.params['listid'] || ''}/${this.props.item.id}/category`)}
            >
              <CategoryComponent categoryId={this.props.item.category} categories={this.props.categories} />
            </button>
          )}
        />

        {this.state.isEditing ? (
          <form onSubmit={this.handleSumbit} className="EditItemComponent__name">
            <AutosizeTextarea
              type="text"
              value={this.state.inputValue}
              onBlur={this.handleBlur}
              onChange={this.handleChange}
              onKeyDown={this.handleInputKeyDown}
              innerRef={(input) => {
                this.input = input
              }}
            />
          </form>
        ) : (
          <div
            className="EditItemComponent__name"
            tabIndex={0}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            onKeyDown={this.handleDivKeyDown}
            onClick={this.handleDivClick}
            ref={(itemDiv) => (this.itemDiv = itemDiv)}
          >
            <ItemComponent item={this.props.item} />
          </div>
        )}
        <IconButton
          onClick={(e) => this.props.deleteItem(this.props.item.id)}
          icon="DELETE"
          alt="Delete"
          className="EditItemComponent__delete KeyFocusComponent--noFocus"
        />
      </li>
    )
  }

  componentDidUpdate(): void {
    if (this.state.hasFocus) {
      if (this.input != null) {
        this.input.focus()
      } else if (this.itemDiv != null) {
        this.itemDiv.focus()
      }
    }
  }
}
