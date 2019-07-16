// @flow
import { createOrder, errorMap } from 'shoppinglist-shared'
import { type ShoppingListRequest } from './ShoppingListController'


export default class OrdersController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(req.list.orders)
    next()
  }

  handlePut = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({error: 'Must be array of orders!'})
        return
    }
    let orders
    try {
      orders = errorMap(req.body, createOrder)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    req.updatedList = { ...req.list, orders: orders }

    res.json(orders)
    next()
  }
}
