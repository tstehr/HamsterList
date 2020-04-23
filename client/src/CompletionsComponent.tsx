import fuzzy from 'fuzzy'
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
// import FlipMove from 'react-flip-move'
import { CategoryDefinition, CompletionItem, itemToString, LocalItem } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import { ItemInput } from './CreateItemComponent'
import { CreateItem, DeleteCompletion } from './ShoppingListContainerComponent'

interface Props {
  focusItemsInCreation: boolean
  itemsInCreation: readonly ItemInput[]
  completions: readonly CompletionItem[]
  categories: readonly CategoryDefinition[]
  createItem: CreateItem
  deleteCompletion: DeleteCompletion
  focusInput: () => void
}
export default class CompletionsComponent extends Component<Props> {
  getCompletionItems(): readonly LocalItem[] {
    if (this.props.itemsInCreation.length === 0) {
      return []
    }

    const itemsInCreationNames = this.props.itemsInCreation.map((ii) => ii.item.name.trim().toLowerCase())

    let results: Array<fuzzy.FilterResult<CompletionItem> & { item: LocalItem }> = []
    for (const itemInput of this.props.itemsInCreation) {
      const itemInCreation = itemInput.item
      const resultsForItem = fuzzy
        .filter(itemInCreation.name, this.props.completions as CompletionItem[], {
          extract: (item: CompletionItem) => item.name,
        })
        .map((el) => ({
          ...el,
          item: { ...itemInCreation, ...el.original },
        }))
      results.splice(results.length, 0, ...resultsForItem)
    }
    results = results.filter((el) => !itemsInCreationNames.includes(el.item.name.trim().toLowerCase()))
    results = _.orderBy(results, ['score'], ['desc'])

    let resultItems = results.map((el) => el.item)
    resultItems = _.uniqBy(resultItems, (item) => item.name.trim().toLowerCase())
    resultItems = resultItems.slice(0, 10)

    return resultItems
  }

  render(): JSX.Element {
    const itemsInCreation = this.props.itemsInCreation.map((ii) => ii.item)
    const itemToKey = new Map()

    const itemsByRepr = _.groupBy(itemsInCreation, itemToString)

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
