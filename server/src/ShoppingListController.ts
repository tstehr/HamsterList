import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { CategoryDefinition, Change, createShoppingList, diffShoppingLists, getOnlyNewChanges } from 'shoppinglist-shared'
import { DB, updateInArray } from './DB'
import { createServerShoppingList, getBaseShoppingList, ServerShoppingList } from './ServerShoppingList'
import { ShoppingListChangeCallback } from './SocketController'
import TokenCreator from './TokenCreator'

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
    changeCallback: ShoppingListChangeCallback
  ) {
    this.db = db
    this.defaultCategories = defaultCategories
    this.tokenCreator = tokenCreator
    this.changeCallback = changeCallback
  }

  handleParamListid = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    req.listid = req.params.listid
    req.log = req.log.child({
      operation: req.url.substring(req.listid.length + 1),
      listid: req.listid,
    })
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
        req.list.categories
      )
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    if (bodyList.id !== req.listid) {
      res.status(400).json({
        error: "List ids don't match",
      })
      return
    }

    const updatedList = createServerShoppingList({ ...req.list, title: bodyList.title })
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
      this.db.write().catch(req.log.error)
    }

    next()
  }
}
