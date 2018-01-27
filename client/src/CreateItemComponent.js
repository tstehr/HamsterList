// @flow
import React, { Component } from 'react'
import { type LocalItem, type CompletionItem, createLocalItemFromString } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import CompletionsComponent from './CompletionsComponent'
import SuggestionsComponent from './SuggestionsComponent'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import './CreateItemComponent.css'


type Props = {
  recentlyDeleted: $ReadOnlyArray<string>,
  completions: $ReadOnlyArray<CompletionItem>,
  createItem: CreateItem,
}

type State = {
  inputValue: string,
}

export default class CreateItemComponent extends Component<Props, State> {
  root: ?HTMLDivElement
  input: ?HTMLInputElement
  focusTimeoutId: ?number


  constructor(props: Props) {
    super(props)
    this.state = {
      inputValue: "",
    }
  }

  handleFocus = (e: SyntheticFocusEvent<>) => {
    //clearTimeout(this.focusTimeoutId)
  }

  handleBlur = (e: SyntheticFocusEvent<>) => {
    // this.focusTimeoutId = setTimeout(() => {
    //   this.setState({inputValue: ""})
    // }, 0)
  }

  handleChange = (e: SyntheticInputEvent<>) => { this.setState({inputValue: e.target.value}) }

  handleSubmit = (e: SyntheticEvent<>) => {
    this.createItem(createLocalItemFromString(this.state.inputValue))
    e.preventDefault()
  }

  handleKeyDown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Escape') {
      this.setState({inputValue: ""})
      e.preventDefault()
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.root != null) {
      const root = this.root
      const focusable: HTMLElement[] = [...root.querySelectorAll('a[href], input, button')]
        .filter((element) => !element.classList.contains("noArrowFocus"))

      const focused = root.querySelector(':focus')
      if (focused == null) {
        return
      }

      let newIndex

      if (focusable.includes(focused)) {
        const index = focusable.indexOf(focused)

        if (e.key === 'ArrowUp') {
            newIndex = index - 1
        } else if (e.key === 'ArrowDown') {
            newIndex = index + 1
        }
      } else {
        const all: HTMLElement[] = [...root.querySelectorAll('*')]
        const index = all.indexOf(focused)
        let search
        if (e.key === 'ArrowUp') {
            search = all.slice(0, index).reverse()
        } else if (e.key === 'ArrowDown') {
          search = all.slice(index)
        }
        if (search != null) {
          for (const el of search) {
            if (focusable.includes(el)) {
              newIndex = focusable.indexOf(el)
              break
            }
          }
        }
      }

      if (newIndex != null) {
        if (newIndex < 0) {
          newIndex = newIndex + focusable.length
        } else if (newIndex >= focusable.length) {
          newIndex = newIndex - focusable.length
        }
        focusable[newIndex].focus()
        e.preventDefault()
      }
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
    const itemInCreation = createLocalItemFromString(this.state.inputValue)

    return (
      <div className="CreateItemComponent" onKeyDown={this.handleKeyDown} onFocus={this.handleFocus} onBlur={this.handleBlur} ref={(root) => { this.root = root }} >
        <form className="CreateItemComponent__form" onSubmit={this.handleSubmit}>
          <input
            type="text"
            value={this.state.inputValue}
            onChange={this.handleChange}
            ref={(input) => { this.input = input }}
          />
          <button className="noArrowFocus">Save</button>
        </form>
        {isCreatingItem
            ? <CompletionsComponent completions={this.props.completions} itemInCreation={itemInCreation} createItem={this.createItem}/>
            : <SuggestionsComponent completions={this.props.completions} recentlyDeleted={this.props.recentlyDeleted} createItem={this.createItem}/>
        }
      </div>
    )
  }
}
