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
    let categorySpecs: $ReadOnlyArray<mixed> = req.body
    let categories: $ReadOnlyArray<CategoryDefinition>
    try {
      categories = errorMap<mixed, CategoryDefinition>(categorySpecs, createCategoryDefinition)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    req.updatedList = { ...req.list, categories: categories }

    res.json(categories)
    next()
  }
}
