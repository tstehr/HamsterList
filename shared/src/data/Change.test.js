// @flow
import _ from 'lodash'
import { createShoppingList } from './ShoppingList'
import { createItem } from './Item'
import { type UUID, createUUID } from '../util/uuid'
import {
  type DeleteItem, ADD_ITEM, DELETE_ITEM,
  diffShoppingLists, createAddItem, createUpdateItem, createDeleteItem, applyDiff
} from './Change'

const id = createUUID("a58df112-085f-4742-873d-8f8e31af7826")

const shoppingList = createShoppingList({
  "id": "Unterwegs",
  "title": "Unterwegs",
  "items": [
    {
      "name": "Gemüse",
      "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
      "id": "cee268a4-7506-4000-a740-5c98e50809c6"
    },
    {
      "name": "Dosen Kichererbsen",
      "category": "bef7bffc-6f54-450a-804e-799d1da5b976",
      "amount": {
        "value": 2
      },
      "id": "c14ef9de-3075-445e-9225-6a50e0c0adca"
    },
    {
      "name": "Kaffeebohnen",
      "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
      "id": "69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd"
    }
  ]
}, [])

describe('diffShoppingLists', () => {
  it('Recognizes addition', () => {
    const originalDiff = createAddItem(createItem({
        "name": "loser Pfefferminztee",
        "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
        "id": "cbda3946-f136-4c94-8280-4931100576b4",
        "amount": null
    }))
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })

  it('Recognizes update', () => {
    const originalDiff = createUpdateItem(shoppingList, createItem({
      "name": "Gemüse",
      "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
      "id": "cee268a4-7506-4000-a740-5c98e50809c6",
      "amount": {
        "value": 5
      }
    }))
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })

  it('Recognizes delete', () => {
    const originalDiff = createDeleteItem(shoppingList, createUUID("69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd"))
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })
})

describe('applyDiff', () => {
  it('Applies an ADD_ITEM diff', () => {
    const item = createItem({
        "name": "loser Pfefferminztee",
        "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
        "id": "cbda3946-f136-4c94-8280-4931100576b4",
        "amount": null
    })
    const result = applyDiff(shoppingList, createAddItem(item))
    expect(result.items).toContainEqual(item)
  })

  it('Doesn\'t apply ADD_ITEM if item with id already exists', () => {
    const item = createItem({
      "name": "Kaffeebohnen",
      "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
      "id": "69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd"
    })

    expect(() => {
      applyDiff(shoppingList, createAddItem(item))
    }).toThrow(`Can't apply diff, there already exists an item with id ${item.id}`)
  })

  it('Applies a UPDATE_ITEM diff', () => {
    const result = applyDiff(shoppingList, createDeleteItem(shoppingList, createUUID("69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd")))
    expect(result.items).toHaveLength(2)
  })

  it('Applies a DELETE_ITEM diff', () => {
    const result = applyDiff(shoppingList, createDeleteItem(shoppingList, createUUID("69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd")))
    expect(result.items).toHaveLength(2)
  })

  it('Doesn\'t apply DELETE_ITEM if item doesn\'t exit', () => {
    // we don't use createDeleteItem, because we need an invalid diff
    const deleteItemDiff: DeleteItem = {
      type: DELETE_ITEM,
      oldItem: createItem({
          "name": "loser Pfefferminztee",
          "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
          "id": "cbda3946-f136-4c94-8280-4931100576b4",
          "amount": null
      })
    }
    expect(() => {
      applyDiff(shoppingList, deleteItemDiff)
    }).toThrow(`Can't apply diff, old item not found in list`)
  })
})

describe('createUpdateItem', () => {
  it('Doesn\'t create an update if nothing was changed', () => {
    const item =  createItem({
      "name": "Dosen Kichererbsen",
      "category": "bef7bffc-6f54-450a-804e-799d1da5b976",
      "amount": {
        "value": 2
      },
      "id": "c14ef9de-3075-445e-9225-6a50e0c0adca"
    })

    expect(() => {
      createUpdateItem(shoppingList, item)
    }).toThrow(`Can't create update for item with id ${item.id}, it is unchanged in the list.`)
  })

  it('Doesn\'t create an update if a key was changed from not defined to undefined', () => {
    const item =  createItem({
      "name": "Kaffeebohnen",
      "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
      "id": "69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd",
      "amount": undefined
    })

    console.log(shoppingList)

    expect(() => {
      createUpdateItem(shoppingList, item)
    }).toThrow(`Can't create update for item with id ${item.id}, it is unchanged in the list.`)
  })
})
