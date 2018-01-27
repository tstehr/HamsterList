// @flow
import React, { Component } from 'react'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, itemToString } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {
  itemInCreation: LocalItem,
  completions: $ReadOnlyArray<CompletionItem>,
  createItem: (item: LocalItem) => void,
}

type State = {
  hasFocus: boolean
}

export default class CompletionsComponent extends Component<Props, State> {
  focusTimeoutId: ?number

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false
    }
  }

  handleFocus = (e: SyntheticFocusEvent<>) => {
    clearTimeout(this.focusTimeoutId)
    this.setState({
      hasFocus: true
    })
  }

  handleBlur = (e: SyntheticFocusEvent<>) => {
    this.focusTimeoutId = setTimeout(() => {
      this.setState({
        hasFocus: false
      })
    }, 0)
  }

  componentWillUnmount() {
    clearTimeout(this.focusTimeoutId)
  }

  render() {
    const itemInCreationName = this.props.itemInCreation.name

    const results = fuzzy.filter(itemInCreationName, this.props.completions, {extract: item => item.name})
    const sortedCompletions = results.map(el => el.original).slice(0, 10)

    const completionItems = sortedCompletions
      .map((completionItem) => Object.assign({}, this.props.itemInCreation, completionItem))
      .filter((item) => itemToString(item).toLowerCase() !== itemToString(this.props.itemInCreation).toLowerCase())

    console.log(this.props.completions)

    return (
      <ul onFocus={this.handleFocus} onBlur={this.handleBlur}>
        <li key={this.props.itemInCreation.name} style={{display:"block"}}>
          <CreateItemButtonComponent item={this.props.itemInCreation} createItem={this.props.createItem} focused={!this.state.hasFocus} noArrowFocus/>
        </li>
        {completionItems.map((item) =>
          <li key={item.name+'_'+item.category} style={{display:"block"}}>
            <CreateItemButtonComponent item={item} createItem={this.props.createItem}/>
          </li>
        )}
      </ul>
    )
  }
}
