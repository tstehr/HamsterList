// @flow
import _ from 'lodash'
import express from 'express'
import { type ShoppingListRequest } from './ShoppingListController'

export default class ChangesController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(req.list.changes)
    next()
  }
}
