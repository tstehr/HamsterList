// @flow
import React from 'react'
import { type LocalItem, type CompletionItem, createLocalItemFromString } from 'shoppinglist-shared'
import CreateItemButtonComponent from './CreateItemButtonComponent'

type Props = {
  completions: $ReadOnlyArray<CompletionItem>,
  recentlyDeleted: $ReadOnlyArray<string>,
  createItem: (item: LocalItem) => void,
}

export default function SuggestionsComponent(props: Props) {
  return (
    <ul>
      {[...props.recentlyDeleted].reverse().map((itemStr) => {
        const item = createLocalItemFromString(itemStr)
        return (
          <li key={itemStr} style={{display:"block"}}>
            <CreateItemButtonComponent item={item} createItem={props.createItem}/>
          </li>
        )
      })}
    </ul>
  )
}
