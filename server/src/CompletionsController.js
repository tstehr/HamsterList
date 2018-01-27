// @flow
import _ from 'lodash'
import express from 'express'
import { type ShoppingListRequest } from './ShoppingListController'

export default class CompletionsController {
  handleGet = (req: ShoppingListRequest, res: express$Response) => {
    const recentlyUsed = req.list.recentlyUsed
    // $FlowFixMe
    const sortedRecentlyUsed = _.orderBy(recentlyUsed,
      [entry => frecency(entry)], ['desc']
    )
    res.json(sortedRecentlyUsed.map(entry => entry.item))
  }
}

function frecency(entry: {lastUsedTimestamp: number, uses: number}) {
  const minutes = (Date.now() - entry.lastUsedTimestamp) / (60 * 1000)
  const frecency = entry.uses / minutes
  return frecency
}
