// @flow
import _ from 'lodash'
// $FlowFixMe
import React, { Component, Fragment } from 'react'
import FlipMove from 'react-flip-move'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
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
  createItem: CreateItem,
  focusInput: () => void,
}

export default class CompletionsComponent extends Component<Props> {
  getCompletionItems() {
    if (!this.props.isCreatingItem) {
      return [...this.props.recentlyDeleted].reverse().slice(0, 10)
    }
    if (this.props.itemsInCreation.length === 0) {
      return []
    }

    const itemsInCreationNames = this.props.itemsInCreation.map(item => item.name.trim().toLowerCase())

    let results = []
    for (const itemInCreation of this.props.itemsInCreation) {
      const resultsForItem = fuzzy.filter(itemInCreation.name, this.props.completions, {extract: item => item.name})
      resultsForItem.forEach((el) => el.item = Object.assign({}, itemInCreation, el.original))
      results.splice(results.length, 0, ...resultsForItem)
    }
    results = results.filter(el => itemsInCreationNames.indexOf(el.item.name.trim().toLowerCase()) === -1)
    results = _.orderBy(results, ['score'], ['desc'])
    results = results.map(el => el.item)
    results = _.uniqBy(results, item => item.name.trim().toLowerCase())
    results = results.slice(0, 10)

    return results
  }

  render() {
    const itemToKey = new Map()
    const itemsByRepr = _.groupBy(this.props.itemsInCreation, itemToString)
    for (const [repr, items] of Object.entries(itemsByRepr)) {
      for (const [iStr, item] of Object.entries(items)) {
        const i: number = +iStr
        if (i === 0) {
          itemToKey.set(item, repr)
        } else {
          itemToKey.set(item, `${repr}${i-1}`)
        }
      }
    }


    return (
      // <FlipMove typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
      //   enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
      //   disableAllAnimations={this.props.disableAllAnimations}
      //   maintainContainerHeight
      // >
      <Fragment>
        {this.props.isCreatingItem &&
          this.props.itemsInCreation.map(item =>
            <CreateItemButtonComponent key={itemToKey.get(item)}
              item={item} categories={this.props.categories}
              createItem={this.props.createItem} focusInput={this.props.focusInput}
              noArrowFocus focused={this.props.focusItemsInCreation}
            />
          )
        }
        {
          this.getCompletionItems().map(item =>
            <CreateItemButtonComponent key={itemToString(item)}
              item={item} categories={this.props.categories}
              createItem={this.props.createItem} focusInput={this.props.focusInput}
            />
          )
        }
      </Fragment>
      // </FlipMove>
    )
  }
}
