// @flow
// $FlowFixMe
import React, { Component } from 'react'
import _ from 'lodash'
import AutosizeTextarea from 'react-autosize-textarea'
import { type LocalItem, type CompletionItem, type CategoryDefinition, createLocalItemFromString, itemToString, addMatchingCategory } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import CompletionsComponent from './CompletionsComponent'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import KeyFocusComponent from './KeyFocusComponent'
import IconButton from './IconButton'
import './CreateItemComponent.css'

import add from './icons/add.svg'

type Props = {
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
}

type State = {
  inputValue: string,
  itemsForInputLines: $ReadOnlyArray<LocalItem | null>,
  itemsInCreation: $ReadOnlyArray<LocalItem>,
  formHasFocus: boolean,
  forceMultiline: boolean,
  changingQuickly: boolean
}

export default class CreateItemComponent extends Component<Props, State> {
  root: ?HTMLDivElement
  input: ?HTMLInputElement
  focusTimeoutId: TimeoutID
  lastChange: number
  changingQuicklyTimeoutId: TimeoutID


  constructor(props: Props) {
    super(props)
    this.state = {
      inputValue: "",
      itemsForInputLines: [],
      itemsInCreation: [],
      formHasFocus: false,
      forceMultiline: false,
      changingQuickly: false
    }
    this.lastChange = Date.now()
  }

  getItemsForInputLines(inputValue: string): $ReadOnlyArray<LocalItem | null> {
    return inputValue
      .split("\n")
      .map(str => str.trim())
      .map(str => str === "" ? null : str)
      .map(str => str != null ? createLocalItemFromString(str, this.props.categories) : null)
      .map(item => item != null ? addMatchingCategory(item, this.props.completions) : null)
  }

  saveItems() {
    this.state.itemsInCreation.map(this.props.createItem)
    this.setState(this.createInputValueUpdate(""))
    if (this.input != null) {
      this.input.focus()
    }
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

  handleChange = (e: SyntheticInputEvent<>) => {
    const changingQuickly = (Date.now() - this.lastChange) < 250
    this.lastChange = Date.now()
    clearTimeout(this.changingQuicklyTimeoutId)
    if (changingQuickly) {
      this.changingQuicklyTimeoutId = setTimeout(() => {
        this.setState({changingQuickly: false})
      }, 250)
    }

    this.setState({
      ...this.createInputValueUpdate(e.target.value),
      changingQuickly: changingQuickly,
    })
  }

  createInputValueUpdate(newInputValue: string) {
    const itemsForInputLines = this.getItemsForInputLines(newInputValue)
    // $FlowFixMe (see https://github.com/facebook/flow/issues/1414)
    const itemsInCreation: $ReadOnlyArray<LocalItem> = itemsForInputLines.filter(itm => itm != null)

    return {
      inputValue: newInputValue,
      itemsForInputLines: itemsForInputLines,
      itemsInCreation: itemsInCreation,
    }
  }

  handleSubmit = (e: SyntheticEvent<>) => {
    this.saveItems()
    e.preventDefault()
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Escape') {
      this.setState({inputValue: ""})
      e.preventDefault()
    }
  }

  handleKeyDownTextarea = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter' && !e.shiftKey && (!this.isMultiline() || e.metaKey)) {
      this.saveItems()
      e.preventDefault()
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' && this.isMultiline()) {
      e.stopPropagation()
    }
  }

  handleToggleMultiline = (e: SyntheticEvent<>) => {
    if (this.isMultiline() && this.hasMulipleLines()) {
      const confirmation = window.confirm("This will delete the current input, continue?")
      if (!confirmation) {
        return
      }
    }
    this.setState({
      forceMultiline: !this.isMultiline(),
      inputValue: this.isMultiline() ? this.state.inputValue.split("\n")[0] : this.state.inputValue
    })
  }

  createItem = (item: LocalItem) => {
    if (!this.isMultiline()) {
      this.setState(this.createInputValueUpdate(""))
    } else {
      const lineIndex = this.state.itemsForInputLines.indexOf(item)
      if (lineIndex !== -1) {
        const lines = this.state.inputValue.split("\n")
        lines.splice(lineIndex, 1)
        const newInputValue = lines.join("\n")
        this.setState(this.createInputValueUpdate(newInputValue))
      }
    }
    this.props.createItem(item)
  }

  focusInput = () => {
    if (this.input != null) {
      this.input.focus()
    }
  }

  hasMulipleLines() {
    return this.state.inputValue.indexOf("\n") !== -1
  }

  isMultiline() {
    return this.hasMulipleLines() || this.state.forceMultiline
  }

  render() {
    const isCreatingItem = this.state.inputValue !== ""
    const isMultiline = this.isMultiline()
    const itemsInCreation = this.state.itemsInCreation

    const t = _.filter()

    return (
      <div className={"CreateItemComponent" + (isCreatingItem ? " CreateItemComponent--creatingItem" : "")}
        onKeyDown={this.handleKeyDown} ref={(root) => { this.root = root }}
      >
        <KeyFocusComponent direction="vertical" rootTagName="div">
          <form
            className={"CreateItemComponent__form" + (isMultiline ? " CreateItemComponent__form--multiline" : "")}
            onSubmit={this.handleSubmit} onFocus={this.handleFocus} onBlur={this.handleBlur}
          >
            <div className="CreateItemComponent__form__inputWrapper" onClick={() => this.input && this.input.focus()}>
              {!isCreatingItem &&
                <div className="CreateItemComponent__form__inputWrapper__placeholder">
                  {isMultiline ? <span>New Item 1<br />New Item 2<br />…</span> : "New Item"}
                </div>
              }
              <AutosizeTextarea
                type="text" className="KeyFocusComponent--defaultFocus"
                value={this.state.inputValue}
                onChange={this.handleChange} onKeyDown={this.handleKeyDownTextarea}
                innerRef={(input) => { this.input = input }}
              />
            </div>
            <button type="button" className="CreateItemComponent__form__toggleMultiline" onClick={this.handleToggleMultiline}>
              {isMultiline ? "▲" : "▼" }
            </button>
            <IconButton className="CreateItemComponent__form__save" icon={add} alt="Add" />
          </form>
          <div className="KeyFocusComponent--ignore" style={{position:'relative'}}>
            <CompletionsComponent
              isCreatingItem={isCreatingItem} isMultiline={isMultiline}
              focusItemsInCreation={this.state.formHasFocus} disableAllAnimations={this.state.changingQuickly}
              completions={this.props.completions} categories={this.props.categories}
              itemsInCreation={itemsInCreation} recentlyDeleted={this.props.recentlyDeleted}
              createItem={this.createItem} focusInput={this.focusInput}
            />
          </div>
        </KeyFocusComponent>

      </div>
    )
  }
}
