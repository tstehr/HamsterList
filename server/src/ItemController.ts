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
  updateInArray,
  UUID,
} from 'shoppinglist-shared'
import sendErrorResponse from './util/sendErrorResponse.js'
import { addCompletion, getSortedCompletions } from './CompletionsController.js'
import { RecentlyUsedArray } from './ServerShoppingList.js'
import { ListidParam } from './ShoppingListController.js'

export interface ItemidParam extends ListidParam {
  itemid: UUID
}

export default class ItemController {
  handleParamItemid = (req: Request<ItemidParam>, res: Response, next: NextFunction): void => {
    try {
      req.itemid = createUUID(req.params.itemid)
      next()
    } catch (e) {
      return sendErrorResponse(res, e)
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
      localItem = createLocalItem(req.body, (itemSpec) => {
        if (_.isObject(itemSpec) && !('stringRepresentation' in itemSpec)) {
          return itemSpec
        }
        const item = createLocalItemFromItemStringRepresentation(itemSpec, req.list.categories)
        return addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
      })
    } catch (e) {
      return sendErrorResponse(res, e)
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
      item = createItem(req.body, (itemSpec) => {
        if (_.isObject(itemSpec) && !('stringRepresentation' in itemSpec)) {
          return itemSpec
        }
        const item = createItemFromItemStringRepresentation(itemSpec, req.list.categories)
        return addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
      })
    } catch (e) {
      return sendErrorResponse(res, e)
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
