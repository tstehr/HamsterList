import { NextFunction, Response } from 'express'
import _ from 'lodash'
import {
  addMatchingCategory,
  createCompletionItem,
  createItem,
  createItemFromItemStringRepresentation,
  createLocalItem,
  createLocalItemFromItemStringRepresentation,
  createRandomUUID,
  createUUID,
  normalizeCompletionName,
} from 'shoppinglist-shared'
import { Item, LocalItem, UUID } from 'shoppinglist-shared'
import { getSortedCompletions } from './CompletionsController'
import { updateInArray } from './DB'
import { RecentlyUsedArray } from './ServerShoppingList'
import { ShoppingListRequest } from './ShoppingListController'

export type ItemIdRequest = {
  itemid: UUID
} & ShoppingListRequest

export default class ItemController {
  handleParamItemid = (req: ItemIdRequest, res: Response, next: NextFunction) => {
    try {
      req.itemid = createUUID(req.params.itemid)
      next()
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }
  }

  handleGet = (req: ItemIdRequest, res: Response, next: NextFunction) => {
    const item = req.list.items.find((item) => item.id === req.itemid)
    if (item != null) {
      res.json(createItem(item))
      next()
    } else {
      res.status(404).json({
        error: `Item with id "${req.itemid}" not found!`,
      })
    }
  }

  handlePost = (req: ShoppingListRequest, res: Response, next: NextFunction) => {
    let localItem: LocalItem
    try {
      if (req.body.stringRepresentation != null) {
        localItem = createLocalItemFromItemStringRepresentation(req.body, req.list.categories)
        localItem = addMatchingCategory(localItem, getSortedCompletions(req.list.recentlyUsed))
      } else {
        localItem = createLocalItem(req.body)
      }
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    const item: Item = { ...localItem, id: createRandomUUID() }
    req.updatedList = {
      ...req.list,
      items: [...req.list.items, item],
      recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item),
    }
    res.location(`${req.baseUrl}/${req.listid}/items/${item.id}`).status(201).json(item)
    next()
  }

  handlePut = (req: ItemIdRequest, res: Response, next: NextFunction) => {
    let item: Item
    try {
      if (req.body.stringRepresentation != null) {
        item = createItemFromItemStringRepresentation(req.body, req.list.categories)
        item = addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
      } else {
        item = createItem(req.body)
      }
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    if (item.id !== req.itemid) {
      res.status(400).json({
        error: "Item ids don't match",
      })
      return
    }

    let status: number
    if (req.list.items.find((item) => item.id === req.itemid) == null) {
      status = 201
      req.updatedList = {
        ...req.list,
        items: [...req.list.items, item],
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item),
      }
    } else {
      status = 200
      req.updatedList = {
        ...req.list,
        items: updateInArray(req.list.items, item),
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item),
      }
    }

    res.status(status).json(item)
    next()
  }

  handleDelete = (req: ItemIdRequest, res: Response, next: NextFunction) => {
    const item = req.list.items.find((item) => item.id === req.itemid)

    if (item == null) {
      res.status(404).json({
        error: `Item with id "${req.itemid}" not found!`,
      })
      return
    }

    req.updatedList = { ...req.list, items: req.list.items.filter((item) => item.id !== req.itemid) }
    res.status(204).send()
    next()
  }
}

export function updateRecentlyUsed(recentlyUsed: RecentlyUsedArray, item: Item): RecentlyUsedArray {
  const completionItem = createCompletionItem(_.pick(item, 'name', 'category'))
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
