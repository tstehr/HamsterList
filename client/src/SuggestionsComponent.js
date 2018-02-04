// @flow
import React from 'react'
import { type LocalItem, type CompletionItem, type CategoryDefinition, itemToString } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  createItem: (item: LocalItem) => void,
}

export default function SuggestionsComponent(props: Props) {
  return (
    <ul>
      {[...props.recentlyDeleted].reverse().map((item) => {
        return (
          <li key={itemToString(item)+'_'+item.category} style={{display:"block"}}>
            <CreateItemButtonComponent item={item} createItem={props.createItem} categories={props.categories}/>
          </li>
        )
      })}
    </ul>
  )
}
