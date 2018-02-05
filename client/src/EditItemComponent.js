// @flow
import React, { Component } from 'react'
import { type Item, type LocalItem, type CategoryDefinition, itemToString, createLocalItemFromString, createCategoryDefinition } from 'shoppinglist-shared'
import type { DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import ItemComponent from './ItemComponent'
import CategoryComponent from './CategoryComponent'
import KeyFocusComponent from './KeyFocusComponent'
import './EditItemComponent.css'

type Props = {
  item: Item,
  categories: $ReadOnlyArray<CategoryDefinition>,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
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
        <KeyFocusComponent direction="horizontal" rootTagName="li" className="EditItemComponent">
          <CategoryComponent categoryId={this.props.item.category} categories={this.props.categories}/>
          <div className="EditItemComponent__name">
            {
              this.state.isEditing
              ? <form onSubmit={this.handleSumbit} style={{height:"100%"}}>
                  <input type="text"
                    className="KeyFocusComponent--defaultFocus"
                    value={this.state.inputValue}
                    onBlur={this.handleBlur} onChange={this.handleChange}
                    onKeyDown={this.handleInputKeyDown}
                    ref={(input) => this.input = input}
                  />
                </form>
              : <div tabIndex="0"
                  className="KeyFocusComponent--defaultFocus"
                  onFocus={this.handleFocus} onBlur={this.handleBlur}
                  onKeyDown={this.handleDivKeyDown} onClick={this.handleDivClick}
                  ref={(itemDiv) => this.itemDiv = itemDiv}
                >
                  <ItemComponent item={this.props.item} />
                </div>
            }
          </div>
          <button onClick={() => this.props.deleteItem(this.props.item.id)}>Delete</button>
        </KeyFocusComponent>
    )
  }

  componentDidUpdate(){
    if (this.state.hasFocus) {
      if (this.input != null) {
        this.input.focus()
      } else if (this.itemDiv != null){
        this.itemDiv.focus()
      }
    }
  }
}
