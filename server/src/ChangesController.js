// @flow
import _ from 'lodash'
import express from 'express'
import { type ShoppingListRequest } from './ShoppingListController'

export default class ChangesController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    const oldestIndex = _.findIndex(req.list.changes, (c) => c.token === req.query['oldest'])
    const startIndex = oldestIndex === -1 ? 0 : oldestIndex
    const newestIndex =  _.findIndex(req.list.changes, (c) => c.token === req.query['newest'])
    const endIndex = newestIndex === -1 ? req.list.changes.length : newestIndex + 1
    res.json(req.list.changes.slice(startIndex, endIndex))
    next()
  }
}
