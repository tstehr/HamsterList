import fuzzy from 'fuzzy'
import { Up } from 'HistoryTracker'
import _ from 'lodash'
import React from 'react'
// import FlipMove from 'react-flip-move'
import { CategoryDefinition, CompletionItem, itemToString, LocalItem, UUID } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import { ItemInput } from './CreateItemComponent'
import { AddCompletion, CreateItem, DeleteCompletion } from './sync'

interface Props {
  focusItemsInCreation: boolean
  itemsInCreation: readonly ItemInput[]
  completions: readonly CompletionItem[]
  categories: readonly CategoryDefinition[]
  createItem: CreateItem
  updateItemCategory: (item: LocalItem, categoryId: UUID | null | undefined) => void
  deleteCompletion: DeleteCompletion
  addCompletion: AddCompletion
  focusInput: () => void
  up: Up
}

export default function CompletionsComponent(props: Props) {
  const itemsInCreation = props.itemsInCreation.map((ii) => ii.item)
  const completionItems = getCompletionItems(props.itemsInCreation, props.completions)

  const itemToUniqueRepr = new Map<LocalItem, string>()
  const itemsByRepr = _.groupBy([...itemsInCreation, ...completionItems], itemToString)

  for (const [repr, items] of Object.entries(itemsByRepr)) {
    for (const [iStr, item] of Object.entries(items)) {
      const i: number = +iStr
      const uniqueRepr = i === 0 ? repr : `${repr}${i - 1}`
      itemToUniqueRepr.set(item, uniqueRepr)
    }
  }

  return (
    <>
      {props.itemsInCreation.map((ii) => (
        <CreateItemButtonComponent
          key={itemToUniqueRepr.get(ii.item)}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          itemRepr={itemToUniqueRepr.get(ii.item)!}
          item={ii.item}
          categories={props.categories}
          createItem={props.createItem}
          focusInput={props.focusInput}
          noArrowFocus
          focused={props.focusItemsInCreation}
          deleteCompletion={ii.categoryAdded ? props.deleteCompletion : null}
          updateCategory={(categoryId) => props.updateItemCategory(ii.item, categoryId)}
          up={props.up}
        />
      ))}
      {completionItems.map((item) => (
        <CreateItemButtonComponent
          key={itemToUniqueRepr.get(item)}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          itemRepr={itemToUniqueRepr.get(item)!}
          item={item}
          categories={props.categories}
          createItem={props.createItem}
          deleteCompletion={props.deleteCompletion}
          focusInput={props.focusInput}
          updateCategory={(categoryId) => props.addCompletion({ name: item.name, category: categoryId })}
          up={props.up}
        />
      ))}
    </>
  )
}

function getCompletionItems(itemsInCreation: readonly ItemInput[], completions: readonly CompletionItem[]): readonly LocalItem[] {
  if (itemsInCreation.length === 0) {
    return []
  }

  const itemsInCreationNames = itemsInCreation.map((ii) => ii.item.name.trim().toLowerCase())

  let results: Array<fuzzy.FilterResult<CompletionItem> & { item: LocalItem }> = []
  for (const itemInput of itemsInCreation) {
    const itemInCreation = itemInput.item
    const resultsForItem = fuzzy
      .filter(itemInCreation.name, completions as CompletionItem[], {
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
