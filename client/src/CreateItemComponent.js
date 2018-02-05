// @flow
// $FlowFixMe
import React, { Component, Fragment } from 'react'
import _ from 'lodash'
import { type LocalItem, type CompletionItem, type CategoryDefinition, type UUID, createLocalItemFromString } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import CompletionsComponent from './CompletionsComponent'
import SuggestionsComponent from './SuggestionsComponent'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import KeyFocusComponent from './KeyFocusComponent'
import './CreateItemComponent.css'


type Props = {
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
}

type State = {
  inputValue: string,
  formHasFocus: boolean,
}

export default class CreateItemComponent extends Component<Props, State> {
  root: ?HTMLDivElement
  input: ?HTMLInputElement
  focusTimeoutId: ?number


  constructor(props: Props) {
    super(props)
    this.state = {
      inputValue: "",
      formHasFocus: false
    }
  }

  getItemInCreation(): LocalItem {
    const itemFromString = createLocalItemFromString(this.state.inputValue, this.props.categories);

    const exactMatchingCompletion = this.props.completions
      .find((completionItem) =>
        completionItem.name == itemFromString.name
          && (itemFromString.category == null || itemFromString.category == completionItem.category)
      )
    if (exactMatchingCompletion != null) {
      return Object.assign({}, itemFromString, _.omitBy(exactMatchingCompletion, (val) => val == null))
    }

    const matchingCompletion = this.props.completions
      .find((completionItem) =>
        completionItem.name.toLowerCase() == itemFromString.name.toLowerCase()
          && (itemFromString.category == null || itemFromString.category == completionItem.category)
      )
    if (matchingCompletion != null) {
      return Object.assign({}, itemFromString, _.omitBy(matchingCompletion, (val) => val == null))
    }

    return itemFromString;
  }

  handleFocus = (e: SyntheticFocusEvent<>) => {
    clearTimeout(this.focusTimeoutId)
    this.setState({formHasFocus: true})
  }

  handleBlur = (e: SyntheticFocusEvent<>) => {
    this.focusTimeoutId = setTimeout(() => {
      this.setState({formHasFocus: false})
    }, 0)
  }

  handleChange = (e: SyntheticInputEvent<>) => { this.setState({inputValue: e.target.value}) }

  handleSubmit = (e: SyntheticEvent<>) => {
    this.createItem(this.getItemInCreation())
    e.preventDefault()
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Escape') {
      this.setState({inputValue: ""})
      e.preventDefault()
    }
  }

  createItem = (item: LocalItem) => {
    this.setState({inputValue: ""})
    if (this.input != null) {
      this.input.focus()
    }
    this.props.createItem(item)
  }

  render() {
    const isCreatingItem = this.state.inputValue !== ""
    const itemInCreation = this.getItemInCreation()

    return (
      <div className="CreateItemComponent" onKeyDown={this.handleKeyDown} ref={(root) => { this.root = root }} >
        <KeyFocusComponent direction="vertical" rootTagName="div">
          <form className="CreateItemComponent__form" onSubmit={this.handleSubmit} onFocus={this.handleFocus} onBlur={this.handleBlur}>
            <input
              type="text" className="KeyFocusComponent--defaultFocus"
              value={this.state.inputValue}
              onChange={this.handleChange}
              ref={(input) => { this.input = input }}
            />
            <button>Save</button>
          </form>
          {isCreatingItem &&
            <CreateItemButtonComponent item={itemInCreation} categories={this.props.categories} createItem={this.props.createItem} noArrowFocus focused={this.state.formHasFocus} />
          }
          {isCreatingItem
              ? <CompletionsComponent completions={this.props.completions}  categories={this.props.categories} itemInCreation={itemInCreation} createItem={this.createItem}/>
              : <SuggestionsComponent completions={this.props.completions}  categories={this.props.categories} recentlyDeleted={this.props.recentlyDeleted} createItem={this.createItem}/>
          }
        </KeyFocusComponent>
      </div>
    )
  }
}
