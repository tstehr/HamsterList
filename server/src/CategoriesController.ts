import { NextFunction, Response } from 'express'
import { createCategoryDefinition, errorMap } from 'shoppinglist-shared'
import { CategoryDefinition } from 'shoppinglist-shared'
import { ShoppingListRequest } from './ShoppingListController'

export default class CategoriesController {
  handleGet = (req: ShoppingListRequest, res: Response, next: NextFunction) => {
    res.json(req.list.categories)
    next()
  }

  handlePut = (req: ShoppingListRequest, res: Response, next: NextFunction) => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: 'Must be array of categories!',
      })
      return
    }

    let categorySpecs: ReadonlyArray<unknown> = req.body
    let categories: ReadonlyArray<CategoryDefinition>

    try {
      categories = errorMap<unknown, CategoryDefinition>(categorySpecs, createCategoryDefinition)
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
      return
    }

    req.updatedList = { ...req.list, categories: categories }
    res.json(categories)
    next()
  }
}
