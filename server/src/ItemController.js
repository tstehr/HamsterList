// @flow
import _ from 'lodash'
import express from 'express'
import {
  type Item, type LocalItem, type CompletionItem, type UUID,
  createItem, createLocalItem, createLocalItemFromString, createCompletionItem, createUUID, createRandomUUID
} from 'shoppinglist-shared'
import { type DB, updateInArray } from './DB'
import { type ServerShoppingList, type RecentlyUsedArray } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'


export type ItemIdRequest = {itemid: UUID} & ShoppingListRequest

export default class ItemController {
  db: DB
  changeCallback: ShoppingListChangeCallback

  constructor(db: DB, changeCallback: ShoppingListChangeCallback) {
    this.db = db
    this.changeCallback = changeCallback
  }

  handleParamItemid = (req: ItemIdRequest, res: express$Response, next: express$NextFunction) => {
    try {
      req.itemid = createUUID(req.params.itemid)
      next()
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }
  }

  handleGet = (req: ItemIdRequest, res: express$Response) => {
    const item = req.list.items.find((item) => item.id === req.itemid)
    if (item!= null) {
      res.json(createItem(item))
    } else {
      res.status(404).json({error: `Item with id "${req.itemid}" not found!`})
    }
  }

  handlePost = (req: ShoppingListRequest, res: express$Response) => {
    let localItem: LocalItem
    try {
      if (req.query.parse != null) {
        localItem = createLocalItemFromString(req.body)
      } else {
        localItem = createLocalItem(req.body)
      }
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    const item: Item = {...localItem, id: createRandomUUID()}


    const changedList: ServerShoppingList = {
      ...req.list,
      items: [...req.list.items, item],
      recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
    }

    this.db.set({
      ...this.db.get(),
      lists: updateInArray(this.db.get().lists, changedList)
    })

    this.db.write()
      .then(() => {
        this.changeCallback(changedList)
        res.location(`${req.baseUrl}/${req.listid}/items/${item.id}`).status(201).json(item)
      })
  }

  handlePut = (req: ItemIdRequest, res: express$Response) => {
    let item: Item
    try {
      if (req.query.parse != null) {
        let localItem = createLocalItemFromString(req.body)
        item = {...localItem, id: req.itemid}
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
    let changedList: ServerShoppingList
    if (req.list.items.find((item) => item.id === req.itemid) == null) {
      status = 201
      changedList = {
        ...req.list,
        items: [...req.list.items, item],
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
      }
    } else {
      status = 200
      changedList = {
        ...req.list,
        items: updateInArray(req.list.items, item),
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
      }
    }

    this.db.set({
      ...this.db.get(),
      lists: updateInArray(this.db.get().lists, changedList)
    })
    this.db.write().then(() => {
      this.changeCallback(changedList)
      res.status(status).json(item)
    })
  }


  handleDelete = (req: ItemIdRequest, res: express$Response) => {
    const item = req.list.items.find((item) => item.id === req.itemid)
    if (item != null) {
      const changedList = {
        ...req.list,
        items: req.list.items.filter((item) => item.id === req.itemid),
        recentlyUsed: updateRecentlyUsed(req.list.recentlyUsed, item)
      }

      this.db.set({
        ...this.db.get(),
        lists: updateInArray(this.db.get().lists, changedList)
      })
      this.db.write()
        .then(() => {
          this.changeCallback(changedList)
          res.status(204).send()
        })
    } else {
      res.status(404).json({error: `Item with id "${req.itemid}" not found!`})
    }
  }
}

export function updateRecentlyUsed(recentlyUsed: RecentlyUsedArray, item: Item): RecentlyUsedArray {
  const completionItem = createCompletionItem(_.pick(item, 'name', 'category'))

  const entryIdx = _.findIndex(recentlyUsed, entry => _.isEqual(entry.item, completionItem))

  if (entryIdx === -1) {
    return [...recentlyUsed, {
      lastUsedTimestamp: Date.now(),
      uses: 1,
      item: completionItem
    }]
  } else {
    const entry = recentlyUsed[entryIdx]
    const result = [...recentlyUsed]
    result.splice(entryIdx, 1, {
      lastUsedTimestamp: Date.now(),
      uses: entry.uses + 1,
      item: completionItem
    })
    return result
  }
}
