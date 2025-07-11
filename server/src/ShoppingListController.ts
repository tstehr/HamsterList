import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  CategoryDefinition,
  Change,
  createShoppingList,
  diffShoppingLists,
  getOnlyNewChanges,
  updateInArray,
} from 'hamsterlist-shared'
import sendErrorResponse from './util/sendErrorResponse.js'
import { DB } from './DB.js'
import { createServerShoppingList, getBaseShoppingList, ServerShoppingList } from './ServerShoppingList.js'
import { ShoppingListChangeCallback } from './SocketController.js'
import TokenCreator from './TokenCreator.js'
import normalizeListid from './util/normalizeListid.js'

export interface ListidParam extends ParamsDictionary {
  listid: string
}

export default class ShoppingListController {
  db: DB
  defaultCategories: readonly CategoryDefinition[]
  tokenCreator: TokenCreator
  changeCallback: ShoppingListChangeCallback

  constructor(
    db: DB,
    defaultCategories: readonly CategoryDefinition[],
    tokenCreator: TokenCreator,
    changeCallback: ShoppingListChangeCallback,
  ) {
    this.db = db
    this.defaultCategories = defaultCategories
    this.tokenCreator = tokenCreator
    this.changeCallback = changeCallback
  }

  handleParamListid = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    const listidParam = req.params.listid
    const list = this.getList(listidParam)
    req.list = list
    req.listid = list.id
    req.unnormalizedListid = listidParam

    req.log = req.log.child({
      operation: req.url.substring(req.listid.length + 1),
      listid: list.id,
    })

    next()
  }

  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(getBaseShoppingList(req.list))
    next()
  }

  handleGetItems = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(req.list.items)
    next()
  }

  handlePut = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    let bodyList
    try {
      bodyList = createShoppingList(
        {
          items: [],
          ...req.body,
        },
        req.list.categories,
      )
    } catch (e) {
      return sendErrorResponse(res, e)
    }

    if (bodyList.id !== req.unnormalizedListid && bodyList.id !== req.listid) {
      res.status(400).json({
        error: "List ids don't match",
      })
      return
    }

    const updatedList: ServerShoppingList = { ...req.list, title: bodyList.title }
    req.updatedList = updatedList
    res.json(getBaseShoppingList(updatedList))
    next()
  }

  saveUpdatedList = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    if (req.updatedList) {
      const updatedList = req.updatedList
      const diffs = diffShoppingLists(req.list, updatedList)
      let newList: ServerShoppingList

      if (diffs.length > 0) {
        const change: Change = {
          username: req.username,
          id: req.id,
          date: new Date(),
          diffs: diffs,
        }
        const changes = getOnlyNewChanges([...updatedList.changes, change])
        newList = { ...updatedList, changes }
        req.updatedList = newList
      } else {
        newList = updatedList
      }

      this.changeCallback(newList)
      this.db.set({ ...this.db.get(), lists: updateInArray(this.db.get().lists, newList, true) })
      this.db.write().catch((e) => {
        req.log.error(e)
      })
    }

    next()
  }

  private getList(listidParam: string): ServerShoppingList {
    const lists = this.db.get().lists

    // Support lists created prior to the introduction of listid normalization by trying an exact match first
    const listByExactId = lists.find((list) => list.id == listidParam)
    if (listByExactId) {
      return listByExactId
    }

    // All newly created lists have normalized listids
    const normalizedListid = normalizeListid(listidParam)
    const listByNormalizedId = lists.find((list) => list.id == normalizedListid)
    if (listByNormalizedId) {
      return listByNormalizedId
    }

    // List doesn't exist yet, generate a new one from template.
    return createServerShoppingList({
      id: normalizedListid,
      title: listidParam,
      items: [],
      recentlyUsed: [],
      categories: this.defaultCategories,
      orders: [],
      changes: [],
    })
  }
}
