import { NextFunction, Request, Response } from 'express'
import { createOrder, errorMap } from 'shoppinglist-shared'
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    req.updatedList = { ...req.list, orders: orders }
    res.json(orders)
    next()
  }
}
