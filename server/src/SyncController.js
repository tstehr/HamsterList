// @flow
import _ from 'lodash'
import deepFreeze from 'deep-freeze'
import {
  type ShoppingList, type SyncRequest, type SyncResponse, type SyncedShoppingList, type Item, type UUID,
  createSyncRequest, mergeShoppingLists, addMatchingCategory, createItemFromItemStringRepresentation,
  normalizeCompletionName
} from 'shoppinglist-shared'
import { type ServerShoppingList, getBaseShoppingList, getSyncedShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { updateRecentlyUsed } from './ItemController'
import { getSortedCompletions } from './CompletionsController'
import { getChangesBetween } from './ChangesController'
import TokenCreator from './TokenCreator'


export default class SyncController {
  tokenCreator: TokenCreator

  constructor(tokenCreator: TokenCreator) {
    this.tokenCreator = tokenCreator
  }

  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.send(this.buildResponse(req.list, req.query['includeInResponse']))
    next()
  }

  handlePost = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    let syncRequest: SyncRequest
    try {
      // Convert stringRepresentation items to full items
      if (req.body && req.body.currentState && Array.isArray(req.body.currentState.items)) {
        // $FlowFixMe
        req.body.currentState.items = req.body.currentState.items.map(itemSpec => {
          if (itemSpec != null && typeof itemSpec === "object" && itemSpec.stringRepresentation == null) {
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

    let recentlyUsed = getUpdatedItems(server, merged).reduce((ru, item) => {
      return updateRecentlyUsed(ru, item)
    }, req.list.recentlyUsed)

    if (syncRequest.deleteCompletions != null) {
      const normalizedNames = syncRequest.deleteCompletions.map(name => normalizeCompletionName(name))
      recentlyUsed = recentlyUsed.filter(entry => normalizedNames.indexOf(normalizeCompletionName(entry.item.name)) === -1)
    }

    req.updatedList = {
      ...req.list,
      categories: syncRequest.categories || req.list.categories,
      orders: syncRequest.orders || req.list.orders,
      recentlyUsed: recentlyUsed,
      ...merged,
    }

    req.log.debug({
      base, server, client, merged,
    })

    next()

    if (req.updatedList != null) {
      res.send(this.buildResponse(req.updatedList, syncRequest.includeInResponse, syncRequest.previousSync.changeId))
    } else {
      res.status(500).send({error: 'req.updatedList was null'})
    }
  }

  buildResponse(serverList: ServerShoppingList, includeInResponse: string | string[] | void, previousSyncChangeId: ?UUID): SyncedShoppingList | SyncResponse {
    const list = this.tokenCreator.setToken(getSyncedShoppingList(serverList))

    let includeTypes: string[]
    if (typeof includeInResponse === 'string') {
      includeTypes = [includeInResponse]
    } else if (includeInResponse == null) {
      includeTypes = []
    } else {
      includeTypes = includeInResponse
    }
    
    if (includeTypes.length === 0) {
      return list
    }

    const response: SyncResponse = {
      list
    }
    if (includeTypes.indexOf('categories') !== -1) {
      response.categories = serverList.categories
    }
    if (includeTypes.indexOf('orders') !== -1) {
      response.orders = serverList.orders
    }
    if (includeTypes.indexOf('completions') !== -1) {
      response.completions = getSortedCompletions(serverList.recentlyUsed)
    }
    if (includeTypes.indexOf('changes') !== -1) {
      response.changes = getChangesBetween(serverList.changes, previousSyncChangeId, list.changeId)
    }

    return response
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
