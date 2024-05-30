import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { CompletionItem, createCompletionItem, frecency, normalizeCompletionName } from 'shoppinglist-shared'
import { RecentlyUsed, RecentlyUsedArray } from './ServerShoppingList.js'
import { ListidParam } from './ShoppingListController.js'

export default class CompletionsController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(getSortedCompletions(req.list.recentlyUsed))
    next()
  }

  handlePut = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    let completionItem: CompletionItem
    try {
      completionItem = createCompletionItem(req.body)
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    const completionName = normalizeCompletionName(req.params.completionname)
    if (normalizeCompletionName(completionItem.name) !== completionName) {
      res.status(400).json({
        error: "Completion names don't match",
      })
      return
    }

    req.updatedList = {
      ...req.list,
      recentlyUsed: addCompletion(req.list.recentlyUsed, completionItem),
    }

    res.status(200).json(completionItem)

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

export function addCompletion(recentlyUsed: RecentlyUsedArray, completionItem: CompletionItem) {
  const completionName = normalizeCompletionName(completionItem.name)

  if (completionName.length === 0) {
    return recentlyUsed
  }

  const entryIdx = _.findIndex(recentlyUsed, (entry) => normalizeCompletionName(entry.item.name) === completionName)
  const result = [...recentlyUsed]
  if (entryIdx === -1) {
    result.push({
      lastUsedTimestamp: Date.now(),
      uses: 1,
      item: completionItem,
    })
  } else {
    const entry = recentlyUsed[entryIdx]
    result.splice(entryIdx, 1, {
      lastUsedTimestamp: Date.now(),
      uses: entry.uses + 1,
      item: completionItem,
    })
  }

  return result
}
