// @flow
import _ from 'lodash'
import express from 'express'
import { type CategoryDefinition, createCategoryDefinition } from 'shoppinglist-shared'
import { createServerShoppingList } from './ServerShoppingList'
import { type DB, updateInArray } from './DB'
import { type ShoppingListRequest } from './ShoppingListController'

export default class CategoriesController {
  db: DB

  constructor(db: DB) {
    this.db = db
  }

  handleGet = (req: ShoppingListRequest, res: express$Response) => {
    res.json(req.list.categories)
  }

  handlePut = (req: ShoppingListRequest, res: express$Response) => {
    if (!Array.isArray(req.body)) {
        res.status(400).json({error: 'Must be array of categories!'})
        return
    }
    let categories
    try {
      categories = req.body.map(createCategoryDefinition)
    } catch (e) {
      res.status(400).json({error: e.message})
      return
    }

    const updatedList = createServerShoppingList({ ...req.list, categories: categories })

    this.db.set({
      ...this.db.get(),
      lists: updateInArray(this.db.get().lists, updatedList)
    })

    this.db.write().then(() => {
      res.json(categories)
    })
  }
}
