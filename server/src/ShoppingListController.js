// @flow
import express from 'express'
import _ from 'lodash'
import differenceInDays from 'date-fns/difference_in_days'
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
         orders: [],
         changes: [],
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

      const diffs = diffShoppingLists(req.list, updatedList)

      let newList: ServerShoppingList
      if (diffs.length > 0) {
        const change: Change = {
          username: req.username != null ? req.username : "Anonymus" ,
          id: req.id,
          date: new Date(),
          diffs: diffs
        }

        const allChanges = [...updatedList.changes, change]

        const now = new Date()
        // index of first change that is newer than 14 days
        const dateIndex = _.findIndex(allChanges, (c) => differenceInDays(now, c.date) < 14)
        // index of first change that is more than 200
        const lengthIndex = Math.max(0, allChanges.length - 200)
        // slice away the oldest changes
        const changes = allChanges.slice(Math.min(dateIndex, lengthIndex), allChanges.length)

        newList = {
          ...updatedList,
          changes
        }
      } else {
        newList = updatedList
      }

      req.updatedList = newList

      this.db.set({
        ...this.db.get(),
        lists: updateInArray(this.db.get().lists, newList, true)
      })
      this.db.write().catch(req.log.error)
    }
    next()
  }
}
