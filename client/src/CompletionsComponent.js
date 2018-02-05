// @flow
// $FlowFixMe
import React, { Component, Fragment } from 'react'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {
  itemInCreation: LocalItem,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: (item: LocalItem) => void,
}

type State = {
  hasFocus: boolean
}

export default class CompletionsComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false
    }
  }

  render() {
    const itemInCreationName = this.props.itemInCreation.name

    const results = fuzzy.filter(itemInCreationName, this.props.completions, {extract: item => item.name})
    const sortedCompletions = results.map(el => el.original).slice(0, 10)

    const completionItems = sortedCompletions
      .map((completionItem) => Object.assign({}, this.props.itemInCreation, completionItem))
      .filter((item) => itemToString(item).toLowerCase() !== itemToString(this.props.itemInCreation).toLowerCase()
        || item.category != this.props.itemInCreation.category)

    return (
      <Fragment>
        {completionItems.map((item) =>
            <CreateItemButtonComponent key={item.name+'_'+item.category} item={item} categories={this.props.categories} createItem={this.props.createItem}/>
        )}
      </Fragment>
    )
  }
}
