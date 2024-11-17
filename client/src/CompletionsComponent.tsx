import fuzzy from 'fuzzy'
import { Up } from 'HistoryTracker'
import _ from 'lodash'
import React, { useCallback, useState } from 'react'
// import FlipMove from 'react-flip-move'
import { CategoryDefinition, CompletionItem, itemToString, LocalItem, UUID } from 'hamsterlist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'
import { ItemInput } from './CreateItemComponent'
import { AddCompletion, DeleteCompletion } from './sync'

interface Props {
  focusItemsInCreation: boolean
  itemsForInputLines: readonly (ItemInput | null)[]
  completions: readonly CompletionItem[]
  categories: readonly CategoryDefinition[]
  createItem: (item: LocalItem, lineIndex?: number) => void
  updateItemCategory: (item: LocalItem, lineIndex: number, categoryId: UUID | null | undefined) => void
  deleteCompletion: DeleteCompletion
  addCompletion: AddCompletion
  focusInput: () => void
  up: Up
}

export default function CompletionsComponent({
  focusItemsInCreation,
  itemsForInputLines,
  completions,
  categories,
  createItem,
  updateItemCategory,
  deleteCompletion,
  addCompletion,
  focusInput,
  up,
}: Props) {
  const [recentlyCreatedCompletionItems, setRecentlyCreatedCompletionItems] = useState<LocalItem[]>([])

  const createItemFromCompletion = useCallback(
    (item: LocalItem) => {
      setRecentlyCreatedCompletionItems((rci) => [...rci, item])
      createItem(item)
    },
    [createItem],
  )

  const itemsInCreation = itemsForInputLines.flatMap((ii) => (ii ? ii.item : []))
  const completionItems = getCompletionItems([...itemsInCreation, ...recentlyCreatedCompletionItems], completions)

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
      {itemsForInputLines.map((ii, lineIndex) =>
        ii ? (
          <CreateItemButtonComponent
            key={itemToUniqueRepr.get(ii.item)}
            itemRepr={itemToUniqueRepr.get(ii.item)!}
            item={ii.item}
            categories={categories}
            createItem={(item) => createItem(item, lineIndex)}
            focusInput={focusInput}
            noArrowFocus
            focused={focusItemsInCreation}
            deleteCompletion={ii.categoryAdded ? deleteCompletion : null}
            updateCategory={(categoryId) => updateItemCategory(ii.item, lineIndex, categoryId)}
            up={up}
          />
        ) : null,
      )}
      {completionItems.map((item) => (
        <CreateItemButtonComponent
          key={itemToUniqueRepr.get(item)}
          itemRepr={itemToUniqueRepr.get(item)!}
          item={item}
          categories={categories}
          createItem={createItemFromCompletion}
          deleteCompletion={deleteCompletion}
          focusInput={focusInput}
          updateCategory={(categoryId) => addCompletion({ name: item.name, category: categoryId })}
          up={up}
        />
      ))}
    </>
  )
}

function getCompletionItems(ignoreItems: readonly LocalItem[], completions: readonly CompletionItem[]): readonly LocalItem[] {
  if (ignoreItems.length === 0) {
    return []
  }

  let results: (fuzzy.FilterResult<CompletionItem> & { item: LocalItem })[] = []
  for (const itemInput of ignoreItems) {
    const itemInCreation = itemInput
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
  const ignoreItemNames = ignoreItems.map((ii) => ii.name.trim().toLowerCase())
  results = results.filter((el) => !ignoreItemNames.includes(el.item.name.trim().toLowerCase()))
  results = _.orderBy(results, ['score'], ['desc'])

  let resultItems = results.map((el) => el.item)
  resultItems = _.uniqBy(resultItems, (item) => item.name.trim().toLowerCase())
  resultItems = resultItems.slice(0, 10)

  return resultItems
}
