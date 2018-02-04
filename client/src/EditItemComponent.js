// @flow
import React, { Component } from 'react'
import { type Item, type LocalItem, type CategoryDefinition, itemToString, createLocalItemFromString, createCategoryDefinition } from 'shoppinglist-shared'
import type { DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import './EditItemComponent.css'

type Props = {
  item: Item,
  categories: $ReadOnlyArray<CategoryDefinition>,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
}

type State = {
  hasFocus: boolean,
  inputValue: string,
}

export default class EditItemComponent extends Component<Props, State> {
  input: ?HTMLInputElement

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false,
      inputValue: ""
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

  handleFocus = () => {
    this.setState({
      hasFocus: true,
      inputValue: itemToString(this.props.item)
    })
  }
  handleBlur = () => {
    this.saveItem()
    this.setState({
      hasFocus: false
    })
  }
  handleSumbit = (e: SyntheticEvent<>) => {
    this.saveItem()
    e.preventDefault()
  }
  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Escape') {
      this.setState({
        hasFocus: false,
        inputValue: itemToString(this.props.item)
      })
      e.preventDefault()
    }
  }
  handleChange = (e: SyntheticInputEvent<>) => { this.setState({inputValue: e.target.value}) }


  render() {
    return (
      <li className="EditItemComponent" tabIndex="0">
          <CategoryComponent categoryId={this.props.item.category} categories={this.props.categories}/>
          <div className="EditItemComponent__name">
            {
              this.state.hasFocus
              ? <form onSubmit={this.handleSumbit} style={{height:"100%"}}>
                  <input type="text"
                    value={this.state.inputValue}
                    onBlur={this.handleBlur} onChange={this.handleChange}
                    onKeyDown={this.handleKeyDown}
                    ref={(input) => this.input = input}
                  />
                </form>
              : <div tabIndex="0" onFocus={this.handleFocus}>
                  <ItemComponent item={this.props.item} />
                </div>
            }
          </div>
          <button onClick={() => this.props.deleteItem(this.props.item.id)}>Delete</button>
      </li>
    )
  }

  componentDidUpdate(){
    if (this.state.hasFocus && this.input != null) {
      this.input.focus()
    }
  }
}
