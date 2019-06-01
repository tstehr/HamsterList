// @flow
import _ from 'lodash'
import express from 'express'
import { frecency } from 'shoppinglist-shared'
import { type RecentlyUsedArray } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export default class CompletionsController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(getSortedCompletions( req.list.recentlyUsed))
    next()
  }
}

export function getSortedCompletions(recentlyUsed: RecentlyUsedArray) {
  const sortedRecentlyUsed = _.orderBy(recentlyUsed,
    [entry => frecency(entry)], ['desc']
  )
  return sortedRecentlyUsed.map(entry => entry.item)
}
