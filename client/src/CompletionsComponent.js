// @flow
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
// import FlipMove from 'react-flip-move'
import fuzzy from 'fuzzy'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import type { CreateItem, DeleteCompletion } from './ShoppingListContainerComponent'
import { type ItemInput } from './CreateItemComponent'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {|
  focusItemsInCreation: boolean,
  itemsInCreation: $ReadOnlyArray<ItemInput>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  createItem: CreateItem,
  deleteCompletion: DeleteCompletion,
  focusInput: () => void,
|}

export default class CompletionsComponent extends Component<Props> {
  getCompletionItems(): $ReadOnlyArray<LocalItem> {
    if (this.props.itemsInCreation.length === 0) {
      return []
    }

    const itemsInCreationNames = this.props.itemsInCreation.map((ii) => ii.item.name.trim().toLowerCase())

    let results = []
    for (const itemInput of this.props.itemsInCreation) {
      const itemInCreation = itemInput.item
      const resultsForItem = fuzzy.filter(itemInCreation.name, this.props.completions, { extract: (item) => item.name })
      resultsForItem.forEach((el) => (el.item = Object.assign({}, itemInCreation, el.original)))
      results.splice(results.length, 0, ...resultsForItem)
    }
    results = results.filter((el) => itemsInCreationNames.indexOf(el.item.name.trim().toLowerCase()) === -1)
    results = _.orderBy(results, ['score'], ['desc'])
    results = results.map((el) => el.item)
    results = _.uniqBy(results, (item) => item.name.trim().toLowerCase())
    results = results.slice(0, 10)

    return results
  }

  render() {
    const itemsInCreation = this.props.itemsInCreation.map((ii) => ii.item)
    const itemToKey = new Map()
    const itemsByRepr = _.groupBy(itemsInCreation, itemToString)
    // $FlowFixMe
    const entries: Array<[string, LocalItem[]]> = Object.entries(itemsByRepr)
    for (const [repr, items] of entries) {
      for (const [iStr, item] of Object.entries(items)) {
        const i: number = +iStr
        if (i === 0) {
          itemToKey.set(item, repr)
        } else {
          itemToKey.set(item, `${repr}${i - 1}`)
        }
      }
    }

    return (
      <Fragment>
        {this.props.itemsInCreation.map((ii) => (
          <CreateItemButtonComponent
            key={itemToKey.get(ii.item)}
            item={ii.item}
            categories={this.props.categories}
            createItem={this.props.createItem}
            focusInput={this.props.focusInput}
            noArrowFocus
            focused={this.props.focusItemsInCreation}
            deleteCompletion={ii.categoryAdded ? this.props.deleteCompletion : null}
          />
        ))}
        {this.getCompletionItems().map((item) => (
          <CreateItemButtonComponent
            key={itemToString(item)}
            item={item}
            categories={this.props.categories}
            createItem={this.props.createItem}
            deleteCompletion={this.props.deleteCompletion}
            focusInput={this.props.focusInput}
          />
        ))}
      </Fragment>
    )
  }
}
