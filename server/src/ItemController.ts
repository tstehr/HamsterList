import { NextFunction, Request, Response } from 'express'
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
  Item,
  LocalItem,
  UUID,
} from 'shoppinglist-shared'
import updateInArray from 'shoppinglist-shared/build/util/updateInArray'
import { ListidParam } from 'ShoppingListController'
import { addCompletion, getSortedCompletions } from './CompletionsController'
import { RecentlyUsedArray } from './ServerShoppingList'

export interface ItemidParam extends ListidParam {
  itemid: UUID
}

export default class ItemController {
  handleParamItemid = (req: Request<ItemidParam>, res: Response, next: NextFunction): void => {
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

  handleGet = (req: Request<ItemidParam>, res: Response, next: NextFunction): void => {
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

  handlePost = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
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

  handlePut = (req: Request<ItemidParam>, res: Response, next: NextFunction): void => {
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

  handleDelete = (req: Request<ItemidParam>, res: Response, next: NextFunction): void => {
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
  return addCompletion(recentlyUsed, completionItem)
}
