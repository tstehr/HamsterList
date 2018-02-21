// @flow
import _ from 'lodash'
import express from 'express'
import { type RecentlyUsedArray } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export default class CompletionsController {
  handleGet = (req: ShoppingListRequest, res: express$Response) => {
    res.json(getSortedCompletions( req.list.recentlyUsed))
  }
}

export function getSortedCompletions(recentlyUsed: RecentlyUsedArray) {
  // $FlowFixMe
  const sortedRecentlyUsed = _.orderBy(recentlyUsed,
    [entry => frecency(entry)], ['desc']
  )
  return sortedRecentlyUsed.map(entry => entry.item)
}

function frecency(entry: {lastUsedTimestamp: number, uses: number}) {
  const minutes = (Date.now() - entry.lastUsedTimestamp) / (60 * 1000)
  const frecency = entry.uses / minutes
  return frecency
}
