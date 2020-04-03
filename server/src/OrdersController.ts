import { NextFunction, Request, Response } from 'express'
import { createOrder, errorMap } from 'shoppinglist-shared'

export default class OrdersController {
  handleGet = (req: Request, res: Response, next: NextFunction) => {
    res.json(req.list.orders)
    next()
  }

  handlePut = (req: Request, res: Response, next: NextFunction) => {
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
