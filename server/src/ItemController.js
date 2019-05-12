// @flow
import _ from 'lodash'
import express from 'express'
import {
  type Item, type LocalItem, type CompletionItem, type UUID,
  createItem, createLocalItem, createLocalItemFromString, createCompletionItem, createUUID, createRandomUUID,
  addMatchingCategory, createLocalItemFromItemStringRepresentation, createItemFromItemStringRepresentation
} from 'shoppinglist-shared'
import { updateInArray } from './DB'
import { type ServerShoppingList, type RecentlyUsedArray } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'
import { getSortedCompletions } from './CompletionsController'


export type ItemIdRequest = {itemid: UUID} & ShoppingListRequest

export default class ItemController {
  handleParamItemid = (req: ItemIdRequest, res: express$Response, next: express$NextFunction) => {
    try {
      req.itemid = createUUID(req.params.itemid)
      next()
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }
  }

  handleGet = (req: ItemIdRequest, res: express$Response, next: express$NextFunction) => {
    const item = req.list.items.find((item) => item.id === req.itemid)
    if (item!= null) {
      res.json(createItem(item))
      next()
    } else {
      res.status(404).json({error: `Item with id "${req.itemid}" not found!`})
    }
  }

  handlePost = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    let localItem: LocalItem
    try {
      // $FlowFixMe
      if (req.body.stringRepresentation != null) {
        localItem = createLocalItemFromItemStringRepresentation(req.body, req.list.categories)
        localItem = addMatchingCategory(localItem, getSortedCompletions(req.list.recentlyUsed))
      } else {
        localItem = createLocalItem(req.body)
      }
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    const item: Item = {...localItem, id: createRandomUUID()}

    req.updatedList = {
      ...req.list,
      items: [...req.list.items, item],
      recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
    }

    res.location(`${req.baseUrl}/${req.listid}/items/${item.id}`).status(201).json(item)
    next()
  }

  handlePut = (req: ItemIdRequest, res: express$Response, next: express$NextFunction) => {
    let item: Item
    try {
      // $FlowFixMe
      if (req.body.stringRepresentation != null) {
        item = createItemFromItemStringRepresentation(req.body, req.list.categories)
        item = addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
      } else {
        item = createItem(req.body)
      }
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    if (item.id !== req.itemid) {
      res.status(400).json({error: 'Item ids don\'t match'})
      return
    }

    let status: number
    if (req.list.items.find((item) => item.id === req.itemid) == null) {
      status = 201
      req.updatedList = {
        ...req.list,
        items: [...req.list.items, item],
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
      }
    } else {
      status = 200
      req.updatedList = {
        ...req.list,
        items: updateInArray(req.list.items, item),
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
      }
    }

    res.status(status).json(item)
  }


  handleDelete = (req: ItemIdRequest, res: express$Response) => {
    const item = req.list.items.find((item) => item.id === req.itemid)
    if (item != null) {
      req.updatedList = {
        ...req.list,
        items: req.list.items.filter((item) => item.id !== req.itemid),
      }
      res.status(204).send()
    } else {
      res.status(404).json({error: `Item with id "${req.itemid}" not found!`})
    }
  }
}

export function updateRecentlyUsed(recentlyUsed: RecentlyUsedArray, item: Item): RecentlyUsedArray {
  const completionItem = createCompletionItem(_.pick(item, 'name', 'category'))
  const entryIdx = _.findIndex(recentlyUsed, entry => entry.item.name.trim().toLowerCase() === completionItem.name.trim().toLowerCase())

  const result = [...recentlyUsed]

  if (entryIdx === -1) {
    result.push({
      lastUsedTimestamp: Date.now(),
      uses: 1,
      item: completionItem
    })
  } else {
    const entry = recentlyUsed[entryIdx]
    result.splice(entryIdx, 1, {
      lastUsedTimestamp: Date.now(),
      uses: entry.uses + 1,
      item: completionItem
    })
  }

  return result
}
