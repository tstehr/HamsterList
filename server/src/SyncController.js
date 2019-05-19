// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import {
  type ShoppingList, type SyncRequest, type SyncedShoppingList, type Item, type UUID,
  createShoppingList, createSyncRequest, mergeShoppingLists, addMatchingCategory, createItemFromItemStringRepresentation
} from 'shoppinglist-shared'
import { type ServerShoppingList, getBaseShoppingList, getSyncedShoppingList, createServerShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'
import * as ShoppingListController from './ShoppingListController'
import { updateRecentlyUsed } from './ItemController'
import { getSortedCompletions } from './CompletionsController'
import TokenCreator from './TokenCreator'


export default class SyncController {
  tokenCreator: TokenCreator

  constructor(tokenCreator: TokenCreator) {
    this.tokenCreator = tokenCreator
  }

  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.send(this.tokenCreator.setToken(getSyncedShoppingList(req.list)))
    next()
  }

  handlePost = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    let syncRequest: SyncRequest
    try {
      // Convert stringRepresentation items to full items
      // $FlowFixMe
      if (req.body && req.body.currentState && Array.isArray(req.body.currentState.items)) {
        // $FlowFixMe
        req.body.currentState.items = req.body.currentState.items.map(itemSpec => {
          if (itemSpec.stringRepresentation == null) {
            return itemSpec
          }
          let item = createItemFromItemStringRepresentation(itemSpec, req.list.categories)
          return addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
        })
      }

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

    req.updatedList = {
      ...req.list,
      recentlyUsed: recentlyUsed,
      ...merged,
    }

    req.log.debug({
      base, server, client, merged,
    })

    next()

    if (req.updatedList != null) {
      res.send(this.tokenCreator.setToken(getSyncedShoppingList(req.updatedList)))
    } else {
      res.status(500).send({error: 'req.updatedList was null'})
    }
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
