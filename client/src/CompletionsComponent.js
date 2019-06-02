// @flow
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
// import FlipMove from 'react-flip-move'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import type { CreateItem } from './ShoppingListContainerComponent'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {|
  focusItemsInCreation: boolean,
  itemsInCreation: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
  focusInput: () => void,
|}

export default class CompletionsComponent extends Component<Props> {
  getCompletionItems(): $ReadOnlyArray<LocalItem> {
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
      <Fragment>
        {
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
    )
  }
}
