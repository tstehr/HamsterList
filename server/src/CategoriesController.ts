import { NextFunction, Request, Response } from 'express'
import { CategoryDefinition, createCategoryDefinition, errorMap } from 'shoppinglist-shared'

export default class CategoriesController {
  handleGet = (req: Request, res: Response, next: NextFunction): void => {
    res.json(req.list.categories)
    next()
  }

  handlePut = (req: Request, res: Response, next: NextFunction): void => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({
        error: 'Must be array of categories!',
      })
      return
    }

    const categorySpecs: ReadonlyArray<unknown> = req.body
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
