import classNames from 'classnames'
import { Up } from 'HistoryTracker'
import React, { Component } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import { Route, RouteComponentProps } from 'react-router-dom'
import {
  addMatchingCategory,
  CategoryDefinition,
  Change,
  CompletionItem,
  createLocalItemFromString,
  itemToString,
  LocalItem,
  UUID,
} from 'hamsterlist-shared'
import ChangesComponent from './ChangesComponent'
import CompletionsComponent from './CompletionsComponent'
import styles from './CreateItemComponent.module.css'
import IconButton from './IconButton'
import KeyFocusComponent, { KEY_FOCUS_COMPONENT_NO_FOCUS } from './KeyFocusComponent'
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
  formHasFocus: boolean
  forceMultiline: boolean
}

export default class CreateItemComponent extends Component<Props, State> {
  root: HTMLDivElement | undefined | null
  input: HTMLTextAreaElement | undefined | null
  focusTimeoutID = -1

  constructor(props: Props) {
    super(props)
    this.state = {
      inputValue: '',
      formHasFocus: false,
      forceMultiline: false,
    }
  }

  componentDidMount(): void {
    if (this.input) {
      this.input.focus()
    }
  }

  getItemsForInputLines(inputValue: string): readonly (ItemInput | null)[] {
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
    const itemsForInputLines = this.getItemsForInputLines(this.state.inputValue)
    this.props.performTransaction(() => {
      itemsForInputLines.forEach((ii) => ii && this.props.createItem(ii.item))
    })
    this.setState({ inputValue: '' })

    if (this.input != null) {
      this.input.focus()
    }
  }

  handleFocus = (): void => {
    clearTimeout(this.focusTimeoutID)
    this.setState({
      formHasFocus: true,
    })
  }

  handleBlur = (): void => {
    this.focusTimeoutID = window.setTimeout((): void => {
      this.setState({
        formHasFocus: false,
      })
    }, 0)
  }

  handleChange = (e: React.FormEvent<HTMLTextAreaElement>): void => {
    this.setState({ inputValue: e.currentTarget.value })
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

  handleToggleMultiline = (): void => {
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

  createItem = (item: LocalItem, lineIndex?: number): void => {
    if (!this.isMultiline()) {
      this.setState({ inputValue: '' })
    } else if (lineIndex !== undefined) {
      const lines = this.state.inputValue.split('\n')
      lines.splice(lineIndex, 1)
      const newInputValue = lines.join('\n')
      this.setState({ inputValue: newInputValue })
    }

    this.props.createItem(item)
  }

  updateItemCategory = (item: LocalItem, lineIndex: number, categoryId: UUID | null | undefined): void => {
    if (lineIndex !== -1) {
      const itemString = itemToString(item)
      const category = this.props.categories.find((c) => c.id === categoryId)
      const categoryPrefix =
        categoryId === null || category === null ? '(?) ' : categoryId === undefined ? '' : `(${category?.shortName}) `
      const newLine = categoryPrefix + itemString

      const lines = this.state.inputValue.split('\n')
      lines.splice(lineIndex, 1, newLine)
      const newInputValue = lines.join('\n')
      this.setState({ inputValue: newInputValue })
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
    const itemsForInputLines = this.getItemsForInputLines(this.state.inputValue)
    return (
      <div
        className={classNames(styles.CreateItemComponent, isCreatingItem && styles.creatingItem)}
        onKeyDown={this.handleKeyDown}
        ref={(root) => {
          this.root = root
        }}
      >
        <KeyFocusComponent direction="vertical" rootTagName="div">
          <form
            className={classNames(styles.Form, isMultiline && styles.multiline)}
            onSubmit={this.handleSubmit}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          >
            <div className={styles.InputWrapper} onClick={() => this.input && this.input.focus()}>
              {!isCreatingItem && (
                <div className={styles.Placeholder}>
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
              className={classNames(styles.ToggleMultiline, KEY_FOCUS_COMPONENT_NO_FOCUS)}
              onClick={this.handleToggleMultiline}
            >
              {isMultiline ? '▲' : '▼'}
            </button>
            <IconButton
              className={classNames(styles.Save, KEY_FOCUS_COMPONENT_NO_FOCUS)}
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
                itemsForInputLines={itemsForInputLines}
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
                render={({ history, match }: RouteComponentProps<{ listid: string; itemRepr: string }>) => {
                  history.replace(`/${match.params.listid || ''}`)
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
