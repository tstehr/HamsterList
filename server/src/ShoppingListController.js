// @flow
import {
  type CategoryDefinition, type Change,
  createShoppingList, diffShoppingLists, getOnlyNewChanges,
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

    const updatedList = createServerShoppingList({ ...req.list, title: bodyList.title })
    req.updatedList = updatedList
    
    res.json(getBaseShoppingList(updatedList))
    next()
  }

  saveUpdatedList = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    if (req.list && req.updatedList) {
      const updatedList = req.updatedList

      const diffs = diffShoppingLists(req.list, updatedList)

      let newList: ServerShoppingList
      if (diffs.length > 0) {
        const change: Change = {
          username: req.username,
          id: req.id,
          date: new Date(),
          diffs: diffs
        }

        const changes = getOnlyNewChanges([...updatedList.changes, change])

        newList = {
          ...updatedList,
          changes
        }
        req.updatedList = newList
      } else {
        newList = updatedList
      }

      this.changeCallback(newList)

      this.db.set({
        ...this.db.get(),
        lists: updateInArray(this.db.get().lists, newList, true)
      })
      this.db.write().catch(req.log.error)
    }
    next()
  }
}
