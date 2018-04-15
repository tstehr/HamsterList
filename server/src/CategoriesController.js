// @flow
import _ from 'lodash'
import express from 'express'
import { type CategoryDefinition, createCategoryDefinition, errorMap } from 'shoppinglist-shared'
import { createServerShoppingList } from './ServerShoppingList'
import { type DB, updateInArray } from './DB'
import { type ShoppingListRequest } from './ShoppingListController'
import { type ShoppingListChangeCallback } from './SocketController'


export default class CategoriesController {
  db: DB
  changeCallback: ShoppingListChangeCallback

  constructor(db: DB, changeCallback: ShoppingListChangeCallback) {
    this.db = db
    this.changeCallback = changeCallback
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
      categories = errorMap(req.body, createCategoryDefinition)
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
      this.changeCallback(updatedList)
      res.json(categories)
    })
    .catch(req.log.error)
  }
}
