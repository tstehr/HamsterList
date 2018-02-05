// @flow
// $FlowFixMe
import React, { Fragment } from 'react'
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
    <Fragment>
      {[...props.recentlyDeleted].reverse().map((item) => {
        return (
          <CreateItemButtonComponent key={itemToString(item)+'_'+(item.category || 'undefined')} item={item} createItem={props.createItem} categories={props.categories}/>
        )
      })}
    </Fragment>
  )
}
