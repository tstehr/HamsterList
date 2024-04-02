import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { CategoryDefinition, Change, createShoppingList, diffShoppingLists, getOnlyNewChanges } from 'shoppinglist-shared'
import updateInArray from 'shoppinglist-shared/build/util/updateInArray'
import { DB } from './DB'
import { createServerShoppingList, getBaseShoppingList, ServerShoppingList } from './ServerShoppingList'
import { ShoppingListChangeCallback } from './SocketController'
import TokenCreator from './TokenCreator'
import normalizeListid from './util/normalizeListid'

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
    const { list, shouldPersist } = this.getList(listidParam)
    req.list = list
    req.log.warn(listidParam, list.id, listidParam === list.id)
    if (shouldPersist) {
      req.updatedList = list
    }
    req.listid = list.id

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

  private getList(listidParam: string): { list: ServerShoppingList; shouldPersist: boolean } {
    const lists = this.db.get().lists

    // Support lists created prior to the introduction of listid normalization by trying an exact match first
    const listByExactId = lists.find((list) => list.id == listidParam)
    if (listByExactId) {
      return { list: listByExactId, shouldPersist: false }
    }

    // All newly created lists have normalized listids
    const normalizedListid = normalizeListid(listidParam)
    const listByNormalizedId = lists.find((list) => list.id == normalizedListid)
    if (listByNormalizedId) {
      return { list: listByNormalizedId, shouldPersist: false }
    }

    // List doesn't exist yet, generate a new one from template. We may save it immediately or on 1st write depending on the list
    // name. For the list name we want to use the original un-normalized listid. Therefore, if the listid was changed by
    // normalization we write an empty list immediately so that any later requests using a different form of listid still get the
    // original list name.
    return {
      list: createServerShoppingList({
        id: normalizedListid,
        title: listidParam,
        items: [],
        recentlyUsed: [],
        categories: this.defaultCategories,
        orders: [],
        changes: [],
      }),
      shouldPersist: normalizedListid !== listidParam,
    }
  }
}
