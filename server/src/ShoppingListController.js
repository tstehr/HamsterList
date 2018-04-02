// @flow
import express from 'express'
import { Logger } from 'bunyan'
import { type ShoppingList, type CategoryDefinition, type UUID, createShoppingList, createRandomUUID } from 'shoppinglist-shared'
import { type DB, updateInArray } from './DB'
import { type ServerShoppingList, createServerShoppingList, getBaseShoppingList } from './ServerShoppingList'
import { type ShoppingListChangeCallback } from './SocketController'


export type ShoppingListRequest = { listid: string, list: ServerShoppingList, log: Logger, id: UUID } & express$Request

export default class ShoppingListController {
  db: DB
  log: Logger
  changeCallback: ShoppingListChangeCallback
  defaultCategories: $ReadOnlyArray<CategoryDefinition>

  constructor(
    db: DB,
    changeCallback: ShoppingListChangeCallback,
    log: Logger, defaultCategories:
    $ReadOnlyArray<CategoryDefinition>
  ) {
    this.db = db
    this.log = log
    this.changeCallback = changeCallback
    this.defaultCategories = defaultCategories
  }

  handleParamListid = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    req.listid = req.params.listid
    req.log = this.log.child({id: createRandomUUID(), operation: req.url.substring(req.listid.length + 1), listid: req.listid})
    const list = this.db.get().lists.find((list) => list.id == req.params.listid)
    if (list != null) {
      req.list = list
      next()
    } else {
       const updatedList: ServerShoppingList = createServerShoppingList({
         id: req.listid,
         title: req.listid,
         items: [],
         recentlyUsed: [],
         categories: this.defaultCategories,
         orders: []
       })
       this.db.set({
         ...this.db.get(),
         lists: [...this.db.get().lists, updatedList]
       })
       this.db.write().then(() => {
         req.list = updatedList
         next()
       })
    }
  }

  handleGet = (req: ShoppingListRequest, res: express$Response) => {
    res.json(getBaseShoppingList(req.list))
  }

  handleGetItems = (req: ShoppingListRequest, res: express$Response) => {
    res.json(req.list.items)
  }

  handlePut = (req: ShoppingListRequest, res: express$Response) => {
    let bodyList
    try {
      bodyList = createShoppingList({items: [], ...req.body}, req.list.categories)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }
    if (bodyList.id !== req.listid) {
      res.status(400).json({error: 'List ids don\'t match'})
      return
    }

    const updatedList = createServerShoppingList({ ...req.list, title: bodyList.title })

    this.db.set({
      ...this.db.get(),
      lists: updateInArray(this.db.get().lists, updatedList)
    })

    this.db.write().then(() => {
      this.changeCallback(updatedList)
      res.json(updatedList)
    })
    .catch(req.log.error)
  }
}
