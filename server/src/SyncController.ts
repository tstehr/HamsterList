import deepFreeze from 'deep-freeze'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import {
  addMatchingCategory,
  CategoryDefinition,
  Change,
  CompletionItem,
  createItemFromItemStringRepresentation,
  createSyncRequest,
  Item,
  mergeShoppingLists,
  normalizeCompletionName,
  Order,
  ShoppingList,
  SyncedShoppingList,
  SyncRequest,
  SyncResponse,
  UUID,
} from 'shoppinglist-shared'
import { getChangesBetween } from './ChangesController'
import { getSortedCompletions } from './CompletionsController'
import { updateRecentlyUsed } from './ItemController'
import { getBaseShoppingList, getSyncedShoppingList, ServerShoppingList } from './ServerShoppingList'
import TokenCreator from './TokenCreator'

export default class SyncController {
  tokenCreator: TokenCreator

  constructor(tokenCreator: TokenCreator) {
    this.tokenCreator = tokenCreator
  }

  handleGet = (req: Request, res: Response, next: NextFunction): void => {
    res.send(this.buildResponse(req.list, req.query['includeInResponse']))
    next()
  }

  handlePost = (req: Request, res: Response, next: NextFunction): void => {
    let syncRequest: SyncRequest

    try {
      // Convert stringRepresentation items to full items
      if (req.body && req.body.currentState && Array.isArray(req.body.currentState.items)) {
        req.body.currentState.items = req.body.currentState.items.map((itemSpec: unknown) => {
          if (_.isObject(itemSpec) && !('stringRepresentation' in itemSpec)) {
            return itemSpec
          }
          const item = createItemFromItemStringRepresentation(itemSpec, req.list.categories)
          return addMatchingCategory(item, getSortedCompletions(req.list.recentlyUsed))
        })
      }

      syncRequest = createSyncRequest(req.body)
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    if (syncRequest.previousSync.id != syncRequest.currentState.id || syncRequest.currentState.id != req.listid) {
      res.status(400).json({
        error: "List ids don't match",
      })
      return
    }

    if (!this.tokenCreator.validateToken(syncRequest.previousSync)) {
      res.status(400).json({
        error: 'previousSync is no valid SyncedList',
      })
      return
    }

    const server = getBaseShoppingList(req.list)

    const base = _.omit(syncRequest.previousSync, 'token')

    const client = syncRequest.currentState
    const merged = mergeShoppingLists(base, client, server, req.list.categories)
    let recentlyUsed = getUpdatedItems(server, merged).reduce((ru, item) => {
      return updateRecentlyUsed(ru, item)
    }, req.list.recentlyUsed)

    if (syncRequest.deleteCompletions != null) {
      const normalizedNames = syncRequest.deleteCompletions.map((name) => normalizeCompletionName(name))
      recentlyUsed = recentlyUsed.filter((entry) => normalizedNames.indexOf(normalizeCompletionName(entry.item.name)) === -1)
    }

    req.updatedList = {
      ...req.list,
      categories: syncRequest.categories || req.list.categories,
      orders: syncRequest.orders || req.list.orders,
      recentlyUsed: recentlyUsed,
      ...merged,
    }
    req.log.debug({
      base,
      server,
      client,
      merged,
    })
    next()

    if (req.updatedList != null) {
      res.send(this.buildResponse(req.updatedList, syncRequest.includeInResponse, syncRequest.previousSync.changeId))
    } else {
      res.status(500).send({
        error: 'req.updatedList was null',
      })
    }
  }

  buildResponse(
    serverList: ServerShoppingList,
    includeInResponse: string | readonly string[] | void,
    previousSyncChangeId?: UUID | null
  ): SyncedShoppingList | SyncResponse {
    const list = this.tokenCreator.setToken(getSyncedShoppingList(serverList))

    let includeTypes: readonly string[]
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

    let categories: readonly CategoryDefinition[] | undefined = undefined
    if (includeTypes.indexOf('categories') !== -1) {
      categories = serverList.categories
    }

    let orders: readonly Order[] | undefined = undefined
    if (includeTypes.indexOf('orders') !== -1) {
      orders = serverList.orders
    }

    let completions: readonly CompletionItem[] | undefined = undefined
    if (includeTypes.indexOf('completions') !== -1) {
      completions = getSortedCompletions(serverList.recentlyUsed)
    }

    let changes: readonly Change[] | undefined = undefined
    if (includeTypes.indexOf('changes') !== -1) {
      changes = getChangesBetween(serverList.changes, previousSyncChangeId, list.changeId)
    }

    return {
      list,
      categories,
      orders,
      completions,
      changes,
    }
  }
}

function getUpdatedItems(oldList: ShoppingList, newList: ShoppingList): readonly Item[] {
  const oldMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...oldList.items], 'id')

  const newMap: { [k in UUID]: Item | undefined | null } = _.keyBy([...newList.items], 'id')

  const ids = _.uniq([..._.keys(oldMap), ..._.keys(newMap)])

  const updated: Item[] = []

  for (const id of ids) {
    const oldItem: Item | undefined | null = oldMap[id]
    const newItem: Item | undefined | null = newMap[id]

    // deletes don't count as updates
    if (!_.isEqual(oldItem, newItem) && newItem != null) {
      updated.push(newItem)
    }
  }

  return deepFreeze(updated)
}
