import { NextFunction, Request, Response } from 'express'
import { CategoryDefinition, createCategoryDefinition, errorMap } from 'hamsterlist-shared'
import sendErrorResponse from './util/sendErrorResponse.js'
import { ListidParam } from './ShoppingListController.js'

export default class CategoriesController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    res.json(req.list.categories)
    next()
  }

  handlePut = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: 'Must be array of categories!',
      })
      return
    }

    const categorySpecs: readonly unknown[] = req.body
    let categories: readonly CategoryDefinition[]

    try {
      categories = errorMap<unknown, CategoryDefinition>(categorySpecs, createCategoryDefinition)
    } catch (e) {
      return sendErrorResponse(res, e)
    }

    req.updatedList = { ...req.list, categories: categories }
    res.json(categories)
    next()
  }
}
