// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import { type ShoppingList, type SyncRequest, type Item, type UUID, createShoppingList, createSyncRequest, mergeShoppingLists } from 'shoppinglist-shared'
import { type DB, updateInArray } from './DB'
import { type ServerShoppingList, getBaseShoppingList, createServerShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'
import * as ShoppingListController from './ShoppingListController'
import { updateRecentlyUsed } from './ItemController'
import TokenCreator from './TokenCreator'

export default class SyncController {
  db: DB
  changeCallback: ShoppingListChangeCallback
  tokenCreator: TokenCreator

  constructor(db: DB, changeCallback: ShoppingListChangeCallback, tokenCreator: TokenCreator) {
    this.db = db
    this.changeCallback = changeCallback
    this.tokenCreator = tokenCreator
  }

  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.send(this.tokenCreator.setToken(getBaseShoppingList(req.list)))
  }

  handlePost = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    let syncRequest: SyncRequest
    try {
      syncRequest = createSyncRequest(req.body)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    if (syncRequest.previousSync.id != syncRequest.currentState.id || syncRequest.currentState.id != req.listid) {
      res.status(400).json({error: 'List ids don\'t match'})
      return
    }

    if (!this.tokenCreator.validateToken(syncRequest.previousSync)) {
      res.status(400).json({error: 'previousSync is no valid SyncedList'})
      return
    }

    const server = getBaseShoppingList(req.list)
    const base =_.omit(syncRequest.previousSync, 'token')
    const client = syncRequest.currentState
    const merged = mergeShoppingLists(base, client, server, req.list.categories)

    const recentlyUsed = getUpdatedItems(server, merged).reduce((ru, item) => {
      return updateRecentlyUsed(ru, item)
    }, req.list.recentlyUsed)

    const mergedServerShoppingList: ServerShoppingList = {
      ...req.list,
      recentlyUsed: recentlyUsed,
      ...merged,
    }

    this.db.set({
      ...this.db.get(),
      lists: updateInArray(this.db.get().lists, mergedServerShoppingList)
    })

    this.db.write().then(() => {
      this.changeCallback(mergedServerShoppingList)
      res.send(this.tokenCreator.setToken(merged))
    })
  }
}

function getUpdatedItems(oldList: ShoppingList, newList: ShoppingList): $ReadOnlyArray<Item> {
  const oldMap: {[UUID]: ?Item} = _.keyBy([...oldList.items], 'id')
  const newMap: {[UUID]: ?Item} = _.keyBy([...newList.items], 'id')

  const ids = _.uniq([..._.keys(oldMap), ..._.keys(newMap)])

  const updated: Item[] = []

  for (const id: UUID of ids) {
    const oldItem: ?Item = oldMap[id]
    const newItem: ?Item = newMap[id]

    // deletes don't count as updates
    if (!_.isEqual(oldItem, newItem) && newItem != null) {
      updated.push(newItem)
    }
  }

  return deepFreeze(updated)
}
