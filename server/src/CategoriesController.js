// @flow
import _ from 'lodash'
import express from 'express'
import { type CategoryDefinition, createCategoryDefinition, errorMap } from 'shoppinglist-shared'
import { createServerShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'


export default class CategoriesController {
  handleGet = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    res.json(req.list.categories)
    next()
  }

  handlePut = (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({error: 'Must be array of categories!'})
        return
    }
    let categories
    try {
      categories = errorMap(req.body, createCategoryDefinition)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    req.updatedList = createServerShoppingList({ ...req.list, categories: categories })

    res.json(categories)
    next()
  }
}
