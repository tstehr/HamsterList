import { NextFunction, Request, Response } from 'express'
import { createOrder, errorMap } from 'hamsterlist-shared'
import sendErrorResponse from './util/sendErrorResponse.js'
import { ListidParam } from './ShoppingListController.js'

export default class OrdersController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(req.list.orders)
    next()
  }

  handlePut = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: 'Must be array of orders!',
      })
      return
    }

    let orders
    try {
      orders = errorMap(req.body, createOrder)
    } catch (e) {
      return sendErrorResponse(res, e)
    }

    req.updatedList = { ...req.list, orders: orders }
    res.json(orders)
    next()
  }
}
