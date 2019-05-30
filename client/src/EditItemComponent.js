// @flow
import React, { Component } from 'react'
import { withRouter, Link, Route } from 'react-router-dom'
import { type Item, type LocalItem, type CategoryDefinition, type UUID, itemToString, createLocalItemFromString } from 'shoppinglist-shared'
import { type Up } from './HistoryTracker'
import type { DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import ChooseCategoryComponent from './ChooseCategoryComponent'
import KeyFocusComponent from './KeyFocusComponent'
import IconButton from './IconButton'
import AutosizeTextarea from 'react-autosize-textarea'
import './EditItemComponent.css'

import wastebin from './icons/waste-bin.svg'

type Props = {
  item: Item,
  categories: $ReadOnlyArray<CategoryDefinition>,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
  up: Up,
}

type State = {
  hasFocus: boolean,
  isEditing: boolean,
  inputValue: string,
}


export default class EditItemComponent extends Component<Props, State> {
  input: ?HTMLInputElement
  itemDiv: ?HTMLDivElement

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false,
      isEditing: false,
      inputValue: "",
    }
  }

  saveItem() {
    const itemFromString : LocalItem = createLocalItemFromString(this.state.inputValue, this.props.categories)
    // $FlowFixMe
    const updatedItem: LocalItem = {
      ...itemFromString,
      category: itemFromString.category || this.props.item.category,
    }
    this.props.updateItem(this.props.item.id, updatedItem)
  }

  updateCategory = (category: ?UUID) => {
    const updatedItem: LocalItem = {
      ...this.props.item,
      category: category
    }
    this.props.updateItem(this.props.item.id, updatedItem)
  }

  handleFocus = () => {
    this.setState((prevState) => ({
      hasFocus: true,
      isEditing: prevState.hasFocus ? false : true,
      inputValue: itemToString(this.props.item)
    }))
  }

  handleBlur = () => {
    this.saveItem()
    this.setState({
      hasFocus: false,
      isEditing: false
    })
  }

  handleSumbit = (e: SyntheticEvent<>) => {
    this.saveItem()
    this.setState({
      isEditing: false
    })
    e.preventDefault()
  }

  handleInputKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter') {
      this.saveItem()
      this.setState({
        isEditing: false
      })
      e.preventDefault()
    }
    if (e.key === 'Escape') {
      this.setState({
        isEditing: false,
        inputValue: itemToString(this.props.item)
      })
      e.preventDefault()
    }
  }

  handleChange = (e: SyntheticInputEvent<>) => { this.setState({inputValue: e.target.value}) }

  handleDivKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter') {
      this.setState({
        hasFocus: true,
        isEditing: true,
        inputValue: itemToString(this.props.item)
      })
      e.preventDefault()
    }
  }

  handleDivClick = (e: SyntheticEvent<>) => {
    this.setState({
      hasFocus: true,
      isEditing: true,
      inputValue: itemToString(this.props.item)
    })
  }
  
  render() {
    return (
        <li className="EditItemComponent">
          <Route render={({history, location, match}) =>
            <button type="button" className="EditItemComponent__category KeyFocusComponent--noFocus"
              onClick={() => history.push(`/${match.params['listid'] || ''}/${this.props.item.id}/category`)}
            >
              <CategoryComponent categoryId={this.props.item.category} categories={this.props.categories} />
            </button>
          } />

          {
            this.state.isEditing
            ? <form onSubmit={this.handleSumbit} className="EditItemComponent__name">
                <AutosizeTextarea
                  type="text"
                  value={this.state.inputValue}
                  onBlur={this.handleBlur} onChange={this.handleChange}
                  onKeyDown={this.handleInputKeyDown}
                  innerRef={(input) => { this.input = input }}
                />
              </form>
            : <div className="EditItemComponent__name" tabIndex="0"
                onFocus={this.handleFocus} onBlur={this.handleBlur}
                onKeyDown={this.handleDivKeyDown} onClick={this.handleDivClick}
                ref={(itemDiv) => this.itemDiv = itemDiv}
              >
                <ItemComponent item={this.props.item} />
              </div>
          }
          <IconButton onClick={(e) => this.props.deleteItem(this.props.item.id)} icon={wastebin} alt="Delete" className="KeyFocusComponent--noFocus"/>

          <Route path={`/:listid/${this.props.item.id}/category`} render={({history, match}) =>
            <ChooseCategoryComponent
              categories={this.props.categories} categoryId={this.props.item.category}
              updateCategory={(category) => {
                this.updateCategory(category)
                this.props.up('list')
              }}
            />
          } />
        </li>
    )
  }

  componentDidUpdate(){
    if (this.state.hasFocus) {
      if (this.input != null) {
        this.input.focus()
      } else if (this.itemDiv != null) {
        this.itemDiv.focus()
      }
    }
  }
}
