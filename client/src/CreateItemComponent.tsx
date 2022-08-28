import { Up } from 'HistoryTracker'
import React, { Component } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import { Route } from 'react-router-dom'
import {
  addMatchingCategory,
  CategoryDefinition,
  Change,
  CompletionItem,
  createLocalItemFromString,
  itemToString,
  LocalItem,
  UUID,
} from 'shoppinglist-shared'
import ChangesComponent from './ChangesComponent'
import CompletionsComponent from './CompletionsComponent'
import './CreateItemComponent.css'
import IconButton from './IconButton'
import KeyFocusComponent from './KeyFocusComponent'
import { AddCompletion, ApplyDiff, CreateApplicableDiff, CreateItem, DeleteCompletion, PerformTransaction } from './sync'

export interface ItemInput {
  item: LocalItem
  categoryAdded: boolean
}

interface Props {
  completions: readonly CompletionItem[]
  changes: readonly Change[]
  unsyncedChanges: readonly Change[]
  categories: readonly CategoryDefinition[]
  createItem: CreateItem
  deleteCompletion: DeleteCompletion
  addCompletion: AddCompletion
  applyDiff: ApplyDiff
  createApplicableDiff: CreateApplicableDiff
  up: Up
  performTransaction: PerformTransaction
}

interface State {
  inputValue: string
  itemsForInputLines: ReadonlyArray<ItemInput | null>
  itemsInCreation: readonly ItemInput[]
  formHasFocus: boolean
  forceMultiline: boolean
  changingQuickly: boolean
}

export default class CreateItemComponent extends Component<Props, State> {
  root: HTMLDivElement | undefined | null
  input: HTMLTextAreaElement | undefined | null
  lastChange: number
  focusTimeoutID = -1
  changingQuicklyTimeoutID = -1

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

  componentDidMount(): void {
    if (this.input) {
      this.input.focus()
    }
  }

  getItemsForInputLines(inputValue: string): ReadonlyArray<ItemInput | null> {
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

  saveItems(): void {
    this.props.performTransaction(() => {
      this.state.itemsInCreation.forEach((ii) => this.props.createItem(ii.item))
    })
    this.setState(this.createInputValueUpdate(''))

    if (this.input != null) {
      this.input.focus()
    }
  }

  handleFocus = (e: React.FocusEvent): void => {
    clearTimeout(this.focusTimeoutID)
    this.setState({
      formHasFocus: true,
    })
  }

  handleBlur = (e: React.FocusEvent): void => {
    this.focusTimeoutID = window.setTimeout((): void => {
      this.setState({
        formHasFocus: false,
      })
    }, 0)
  }

  handleChange = (e: React.FormEvent<HTMLTextAreaElement>): void => {
    const changingQuickly = Date.now() - this.lastChange < 250
    this.lastChange = Date.now()
    clearTimeout(this.changingQuicklyTimeoutID)

    if (changingQuickly) {
      this.changingQuicklyTimeoutID = window.setTimeout((): void => {
        this.setState({
          changingQuickly: false,
        })
      }, 250)
    }

    this.setState({ ...this.createInputValueUpdate(e.currentTarget.value), changingQuickly: changingQuickly })
  }

  createInputValueUpdate(
    newInputValue: string
  ): {
    inputValue: string
    itemsForInputLines: ReadonlyArray<ItemInput | null>
    itemsInCreation: readonly ItemInput[]
  } {
    const itemsForInputLines = this.getItemsForInputLines(newInputValue)
    const itemsInCreation: readonly ItemInput[] = itemsForInputLines.filter((ii: ItemInput | null): ii is ItemInput => ii != null)

    return {
      inputValue: newInputValue,
      itemsForInputLines: itemsForInputLines,
      itemsInCreation: itemsInCreation,
    }
  }

  handleSubmit = (e: React.SyntheticEvent): void => {
    this.saveItems()
    e.preventDefault()
  }

  handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.setState({
        inputValue: '',
      })
      e.preventDefault()
    }
  }

  handleKeyDownTextarea = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey && (!this.isMultiline() || e.metaKey)) {
      this.saveItems()
      e.preventDefault()
    }

    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.isMultiline()) {
      e.stopPropagation()
    }
  }

  handleToggleMultiline = (e: React.SyntheticEvent): void => {
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

  createItem = (item: LocalItem): void => {
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

  updateItemCategory = (item: LocalItem, categoryId: UUID | null | undefined): void => {
    const lineIndex = this.state.itemsForInputLines.findIndex((ii) => ii && ii.item === item)

    if (lineIndex !== -1) {
      const itemString = itemToString(item)
      const category = this.props.categories.find((c) => c.id === categoryId)
      const categoryPrefix =
        categoryId === null || category === null ? '(?) ' : categoryId === undefined ? '' : `(${category?.shortName}) `
      const newLine = categoryPrefix + itemString

      const lines = this.state.inputValue.split('\n')
      lines.splice(lineIndex, 1, newLine)
      const newInputValue = lines.join('\n')
      this.setState(this.createInputValueUpdate(newInputValue))
    }
  }

  focusInput = (): void => {
    if (this.input != null) {
      this.input.focus()
    }
  }

  hasMulipleLines(): boolean {
    return this.state.inputValue.includes('\n')
  }

  isMultiline(): boolean {
    return this.hasMulipleLines() || this.state.forceMultiline
  }

  render(): JSX.Element {
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
          <div
            style={{
              position: 'relative',
            }}
          >
            {isCreatingItem ? (
              <CompletionsComponent
                focusItemsInCreation={this.state.formHasFocus}
                completions={this.props.completions}
                categories={this.props.categories}
                itemsInCreation={itemsInCreation}
                createItem={this.createItem}
                updateItemCategory={this.updateItemCategory}
                deleteCompletion={this.props.deleteCompletion}
                addCompletion={this.props.addCompletion}
                focusInput={this.focusInput}
                up={this.props.up}
              />
            ) : (
              <Route
                path={`/:listid/newItem/:itemRepr/category`}
                render={({ history, match }) => {
                  history.replace(`/${match.params['listid'] || ''}`)
                  return null
                }}
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
