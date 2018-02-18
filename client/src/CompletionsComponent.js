// @flow
// $FlowFixMe
import _ from 'lodash'
import React, { Component } from 'react'
import FlipMove from 'react-flip-move'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {
  isCreatingItem: boolean,
  isMultiline: boolean,
  focusItemsInCreation: boolean,
  disableAllAnimations: boolean,
  itemsInCreation: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  createItem: (item: LocalItem) => void,
}

export default class CompletionsComponent extends Component<Props> {
  getCompletionItems() {
    if (!this.props.isCreatingItem) {
      return [...this.props.recentlyDeleted].reverse().slice(0, 10)
    }
    const itemInCreation = this.props.itemsInCreation[0]
    if (itemInCreation == null) {
      return []
    }

    const itemInCreationName = itemInCreation.name

    const results = fuzzy.filter(itemInCreationName, this.props.completions, {extract: item => item.name})
    const sortedCompletions = results.map(el => el.original)

    return sortedCompletions
      .map((completionItem) => Object.assign({}, itemInCreation, completionItem))
      .filter((item) => itemToString(item).toLowerCase() !== itemToString(itemInCreation).toLowerCase()
        || item.category !== itemInCreation.category)
      .slice(0, 10)
  }

  render() {
    return (
      <FlipMove typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
        disableAllAnimations={this.props.disableAllAnimations}
      >
        {this.props.isCreatingItem &&
          this.props.itemsInCreation.map((item, i) =>
            <CreateItemButtonComponent key={`iic_${i}`}
              item={item} categories={this.props.categories} createItem={this.props.createItem}
              noArrowFocus focused={this.props.focusItemsInCreation}
            />
          )
        }
        {!this.props.isMultiline &&
          this.getCompletionItems().map(item =>
            <CreateItemButtonComponent key={itemToString(item) + (item.category || 'undefined')}
              item={item} categories={this.props.categories} createItem={this.props.createItem}
            />
          )
        }
      </FlipMove>
    )
  }
}
