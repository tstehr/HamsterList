import classNames from 'classnames'
import { KEY_FOCUS_COMPONENT_NO_FOCUS } from 'KeyFocusComponent'
import _ from 'lodash'
import React, { Component } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import { Route, RouteComponentProps } from 'react-router-dom'
import { CategoryDefinition, createLocalItemFromString, Item, itemToString, LocalItem } from 'hamsterlist-shared'
import CategoryComponent from './CategoryComponent'
import styles from './EditItemComponent.module.css'
import { Up } from './HistoryTracker'
import IconButton from './IconButton'
import ItemComponent from './ItemComponent'
import { DeleteItem, UpdateItem } from './sync'

interface Props {
  item: Item
  categories: readonly CategoryDefinition[]
  deleteItem: DeleteItem
  updateItem: UpdateItem
  up: Up
}

interface State {
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
      inputValue: itemToString(this.props.item),
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return !_.isEqual(this.state, nextState) || !_.isEqual(this.props.item, nextProps.item)
  }

  saveItem(): void {
    const itemFromString: LocalItem = createLocalItemFromString(this.state.inputValue, this.props.categories)
    const updatedItem: LocalItem = { ...itemFromString, category: itemFromString.category ?? this.props.item.category }
    this.props.updateItem(this.props.item.id, updatedItem)
  }

  handleFocus = (e: React.FocusEvent): void => {
    // Don't treat clicks on focusable children as focus events. This allows links in the item name to be clicked.
    if (
      e.target !== e.currentTarget &&
      e.target instanceof HTMLElement &&
      e.target.tabIndex != null &&
      e.target.tabIndex !== -1
    ) {
      return
    }

    this.setState((prevState) => ({
      hasFocus: true,
      isEditing: prevState.hasFocus ? false : true,
      inputValue: prevState.hasFocus ? prevState.inputValue : itemToString(this.props.item),
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

  handleDivClick = (): void => {
    this.setState({
      hasFocus: true,
      isEditing: true,
      inputValue: itemToString(this.props.item),
    })
  }

  render(): JSX.Element {
    return (
      <li className={styles.EditItemComponent}>
        <Route
          render={({ history, match }: RouteComponentProps<{ listid?: string }>) => (
            <button
              type="button"
              className={classNames(styles.Category, KEY_FOCUS_COMPONENT_NO_FOCUS)}
              onClick={() => history.push(`/${match.params.listid ?? ''}/${this.props.item.id}/category`)}
            >
              <CategoryComponent categoryId={this.props.item.category} categories={this.props.categories} />
            </button>
          )}
        />

        {this.state.isEditing ? (
          <form onSubmit={this.handleSumbit} className={styles.Name}>
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
            className={styles.Name}
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
          onClick={() => this.props.deleteItem(this.props.item.id)}
          icon="DELETE"
          alt="Delete"
          className={classNames(styles.Delete, KEY_FOCUS_COMPONENT_NO_FOCUS)}
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
