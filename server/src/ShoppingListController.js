// @flow
import express from 'express'
import { Logger } from 'bunyan'
import {
  type ShoppingList, type CategoryDefinition, type Change, type UUID,
  createShoppingList, createRandomUUID, diffShoppingLists
} from 'shoppinglist-shared'
import { type DB, updateInArray } from './DB'
import { type ServerShoppingList, createServerShoppingList, getBaseShoppingList } from './ServerShoppingList'
import { type ShoppingListChangeCallback } from './SocketController'
import { type UserRequest } from './index'
import TokenCreator from './TokenCreator'

export type ShoppingListRequest = { listid: string, list: ServerShoppingList, updatedList?: ServerShoppingList } & UserRequest


export default class ShoppingListController {
  db: DB
  defaultCategories: $ReadOnlyArray<CategoryDefinition>
  tokenCreator: TokenCreator
  changeCallback: ShoppingListChangeCallback

  constructor(
    db: DB,
    defaultCategories: $ReadOnlyArray<CategoryDefinition>,
    tokenCreator: TokenCreator,
    changeCallback: ShoppingListChangeCallback,
  ) {
    this.db = db
    this.defaultCategories = defaultCategories
    this.tokenCreator = tokenCreator
    this.changeCallback = changeCallback
  }

  handleParamListid = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    req.listid = req.params.listid
    req.log = req.log.child({operation: req.url.substring(req.listid.length + 1), listid: req.listid})
    const list = this.db.get().lists.find((list) => list.id == req.params.listid)
    if (list != null) {
      req.list = list
    } else {
      req.list = createServerShoppingList({
         id: req.listid,
         title: req.listid,
         items: [],
         recentlyUsed: [],
         categories: this.defaultCategories,
         orders: []
      })
    }
    next()
  }

  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(getBaseShoppingList(req.list))
    next()
  }

  handleGetItems = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(req.list.items)
    next()
  }

  handlePut = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
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

    req.updatedList = createServerShoppingList({ ...req.list, title: bodyList.title })

    res.json(req.updatedList)
  }

  saveUpdatedList = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    if (req.list && req.updatedList) {
      const updatedList = req.updatedList
      this.changeCallback(updatedList)

      const token = this.tokenCreator.createToken(getBaseShoppingList(updatedList))
      const diffs = diffShoppingLists(req.list, updatedList)

      let newList: ServerShoppingList
      if (diffs.length > 0) {
        const change: Change = {
          username: req.username != null ? req.username : "Anonymus" ,
          token: token,
          date: new Date(),
          diffs: diffs
        }

        const changes = [...updatedList.changes, change]
        const truncatedChanges = changes.slice(Math.max(0, changes.length - 500), changes.length)

        newList = {
          ...updatedList,
          changes
        }
      } else {
        newList = updatedList
      }

      this.db.set({
        ...this.db.get(),
        lists: updateInArray(this.db.get().lists, newList)
      })
      this.db.write().catch(req.log.error)
    }
    next()
  }
}
