// @flow
import React, { Component } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import {
  type LocalItem,
  type CompletionItem,
  type CategoryDefinition,
  type Change,
  createLocalItemFromString,
  addMatchingCategory,
} from 'shoppinglist-shared'
import type { CreateItem, ApplyDiff, CreateApplicableDiff, DeleteCompletion } from './ShoppingListContainerComponent'
import CompletionsComponent from './CompletionsComponent'
import KeyFocusComponent from './KeyFocusComponent'
import IconButton from './IconButton'
import ChangesComponent from './ChangesComponent'
import './CreateItemComponent.css'

export type ItemInput = {
  item: LocalItem,
  categoryAdded: boolean,
}

type Props = {|
  completions: $ReadOnlyArray<CompletionItem>,
  changes: $ReadOnlyArray<Change>,
  unsyncedChanges: $ReadOnlyArray<Change>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
  deleteCompletion: DeleteCompletion,
  applyDiff: ApplyDiff,
  createApplicableDiff: CreateApplicableDiff,
|}

type State = {
  inputValue: string,
  itemsForInputLines: $ReadOnlyArray<ItemInput | null>,
  itemsInCreation: $ReadOnlyArray<ItemInput>,
  formHasFocus: boolean,
  forceMultiline: boolean,
  changingQuickly: boolean,
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
      inputValue: '',
      itemsForInputLines: [],
      itemsInCreation: [],
      formHasFocus: false,
      forceMultiline: false,
      changingQuickly: false,
    }
    this.lastChange = Date.now()
  }

  componentDidMount() {
    if (this.input) {
      this.input.focus()
    }
  }

  getItemsForInputLines(inputValue: string): $ReadOnlyArray<ItemInput | null> {
    return inputValue
      .split('\n')
      .map((str) => str.trim())
      .map((str) => (str === '' ? null : str))
      .map((str) => (str != null ? createLocalItemFromString(str, this.props.categories) : null))
      .map((item) => {
        if (item == null) {
          return null
        }
        const categoryAddedItem = addMatchingCategory(item, this.props.completions)

        return {
          item: categoryAddedItem,
          categoryAdded: categoryAddedItem !== item,
        }
      })
  }

  saveItems() {
    this.state.itemsInCreation.forEach((ii) => this.props.createItem(ii.item))
    this.setState(this.createInputValueUpdate(''))
    if (this.input != null) {
      this.input.focus()
    }
  }

  handleFocus = (e: SyntheticFocusEvent<>) => {
    clearTimeout(this.focusTimeoutId)
    this.setState({ formHasFocus: true })
  }

  handleBlur = (e: SyntheticFocusEvent<>) => {
    this.focusTimeoutId = setTimeout(() => {
      this.setState({ formHasFocus: false })
    }, 0)
  }

  handleChange = (e: SyntheticInputEvent<>) => {
    const changingQuickly = Date.now() - this.lastChange < 250
    this.lastChange = Date.now()
    clearTimeout(this.changingQuicklyTimeoutId)
    if (changingQuickly) {
      this.changingQuicklyTimeoutId = setTimeout(() => {
        this.setState({ changingQuickly: false })
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
    const itemsInCreation: $ReadOnlyArray<ItemInput> = itemsForInputLines.filter((ii) => ii != null)

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
      this.setState({ inputValue: '' })
      e.preventDefault()
    }
  }

  handleKeyDownTextarea = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Enter' && !e.shiftKey && (!this.isMultiline() || e.metaKey)) {
      this.saveItems()
      e.preventDefault()
    }

    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.isMultiline()) {
      e.stopPropagation()
    }
  }

  handleToggleMultiline = (e: SyntheticEvent<>) => {
    if (this.isMultiline() && this.hasMulipleLines()) {
      const confirmation = window.confirm('This will delete the current input, continue?')
      if (!confirmation) {
        return
      }
    }
    this.setState({
      forceMultiline: !this.isMultiline(),
      inputValue: this.isMultiline() ? this.state.inputValue.split('\n')[0] : this.state.inputValue,
    })
  }

  createItem = (item: LocalItem) => {
    if (!this.isMultiline()) {
      this.setState(this.createInputValueUpdate(''))
    } else {
      const lineIndex = this.state.itemsForInputLines.findIndex((ii) => ii && ii.item === item)
      if (lineIndex !== -1) {
        const lines = this.state.inputValue.split('\n')
        lines.splice(lineIndex, 1)
        const newInputValue = lines.join('\n')
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
    return this.state.inputValue.indexOf('\n') !== -1
  }

  isMultiline() {
    return this.hasMulipleLines() || this.state.forceMultiline
  }

  render() {
    const isCreatingItem = this.state.inputValue !== ''
    const isMultiline = this.isMultiline()
    const itemsInCreation = this.state.itemsInCreation

    return (
      <div
        className={'CreateItemComponent' + (isCreatingItem ? ' CreateItemComponent--creatingItem' : '')}
        onKeyDown={this.handleKeyDown}
        ref={(root) => {
          this.root = root
        }}
      >
        <KeyFocusComponent direction="vertical" rootTagName="div">
          <form
            className={'CreateItemComponent__form' + (isMultiline ? ' CreateItemComponent__form--multiline' : '')}
            onSubmit={this.handleSubmit}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          >
            <div className="CreateItemComponent__form__inputWrapper" onClick={() => this.input && this.input.focus()}>
              {!isCreatingItem && (
                <div className="CreateItemComponent__form__inputWrapper__placeholder">
                  {isMultiline ? (
                    <span>
                      New Item 1<br />
                      New Item 2<br />…
                    </span>
                  ) : (
                    'New Item'
                  )}
                </div>
              )}
              <AutosizeTextarea
                type="text"
                value={this.state.inputValue}
                onChange={this.handleChange}
                onKeyDown={this.handleKeyDownTextarea}
                innerRef={(input) => {
                  this.input = input
                }}
              />
            </div>
            <button
              type="button"
              className="CreateItemComponent__form__toggleMultiline KeyFocusComponent--noFocus"
              onClick={this.handleToggleMultiline}
            >
              {isMultiline ? '▲' : '▼'}
            </button>
            <IconButton
              className="CreateItemComponent__form__save KeyFocusComponent--noFocus"
              icon="ADD"
              alt="Add new item
            "
            />
          </form>
          <div style={{ position: 'relative' }}>
            {isCreatingItem && (
              <CompletionsComponent
                focusItemsInCreation={this.state.formHasFocus}
                completions={this.props.completions}
                categories={this.props.categories}
                itemsInCreation={itemsInCreation}
                createItem={this.createItem}
                deleteCompletion={this.props.deleteCompletion}
                focusInput={this.focusInput}
              />
            )}
            {!isCreatingItem && (
              <ChangesComponent
                changes={this.props.changes}
                unsyncedChanges={this.props.unsyncedChanges}
                categories={this.props.categories}
                applyDiff={this.props.applyDiff}
                createApplicableDiff={this.props.createApplicableDiff}
              />
            )}
          </div>
        </KeyFocusComponent>
      </div>
    )
  }
}
