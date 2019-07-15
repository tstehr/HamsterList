// @flow
import _, { type Iteratee } from 'lodash'
import express from 'express'
import { type CompletionItem, frecency, normalizeCompletionName } from 'shoppinglist-shared'
import { type RecentlyUsedArray, type RecentlyUsed } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export default class CompletionsController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(getSortedCompletions(req.list.recentlyUsed))
    next()
  }

  handleDelete = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    const completionName = normalizeCompletionName(req.params.completionname)
    const entryIdx = _.findIndex(req.list.recentlyUsed, entry => normalizeCompletionName(entry.item.name) === completionName) 
    if (entryIdx !== -1) {
      const newRecentlyUsed = [...req.list.recentlyUsed]
      newRecentlyUsed.splice(entryIdx, 1)
      req.updatedList = {
        ...req.list,
        recentlyUsed: newRecentlyUsed
      }
      res.status(204).send()
    } else {      
      res.status(404).json({error: `No completion with name "${completionName}" found.`})
    }
    next()
  }
}

export function getSortedCompletions(recentlyUsed: RecentlyUsedArray) {
  const sortedRecentlyUsed = _.orderBy<RecentlyUsed>(recentlyUsed,
    [(entry: RecentlyUsed) => frecency(entry)], ['desc']
  )
  return sortedRecentlyUsed.map<CompletionItem>(entry => entry.item)
}
