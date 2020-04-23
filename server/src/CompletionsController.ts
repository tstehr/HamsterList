import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { CompletionItem, frecency, normalizeCompletionName } from 'shoppinglist-shared'
import { ListidParam } from 'ShoppingListController'
import { RecentlyUsed, RecentlyUsedArray } from './ServerShoppingList'

export default class CompletionsController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(getSortedCompletions(req.list.recentlyUsed))
    next()
  }

  handleDelete = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    const completionName = normalizeCompletionName(req.params.completionname)
    const entryIdx = _.findIndex(req.list.recentlyUsed, (entry) => normalizeCompletionName(entry.item.name) === completionName)

    if (entryIdx !== -1) {
      const newRecentlyUsed = [...req.list.recentlyUsed]
      newRecentlyUsed.splice(entryIdx, 1)
      req.updatedList = { ...req.list, recentlyUsed: newRecentlyUsed }
      res.status(204).send()
    } else {
      res.status(404).json({
        error: `No completion with name "${completionName}" found.`,
      })
    }

    next()
  }
}

export function getSortedCompletions(recentlyUsed: RecentlyUsedArray): readonly CompletionItem[] {
  const sortedRecentlyUsed = _.orderBy<RecentlyUsed>(recentlyUsed, [(entry: RecentlyUsed): number => frecency(entry)], ['desc'])
  return sortedRecentlyUsed.map<CompletionItem>((entry) => entry.item)
}
