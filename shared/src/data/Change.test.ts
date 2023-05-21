/* eslint-env jest */
import { createUUID } from '../util/uuid'
import {
  ADD_ITEM,
  applyDiff,
  createChange,
  createDiff,
  createReverseDiff,
  DeleteItem,
  DELETE_ITEM,
  diffShoppingLists,
  generateAddItem,
  generateDeleteItem,
  generateUpdateItem,
  isDiffApplicable,
  UPDATE_ITEM,
} from './Change'
import { createItem } from './Item'
import { createShoppingList } from './ShoppingList'

const shoppingList = createShoppingList(
  {
    id: 'Unterwegs',
    title: 'Unterwegs',
    items: [
      {
        name: 'Gemüse',
        category: '6ca0f054-209c-46c9-b337-6088f7a530ab',
        id: 'cee268a4-7506-4000-a740-5c98e50809c6',
      },
      {
        name: 'Dosen Kichererbsen',
        category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
        amount: {
          value: 2,
        },
        id: 'c14ef9de-3075-445e-9225-6a50e0c0adca',
      },
      {
        name: 'Kaffeebohnen',
        category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
        id: '69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd',
      },
    ],
  },
  []
)

describe('createChange', () => {
  it('Creates a change', () => {
    createChange({
      id: 'f4b0c5f5-9355-4833-a1f2-50a4b82e24b7',
      username: 'me',
      date: '1970-01-01T00:00:00Z',
      diffs: [],
    })
  })

  it("Doesn't create change for invalid date", () => {
    expect(() => {
      createChange({
        id: 'f4b0c5f5-9355-4833-a1f2-50a4b82e24b7',
        username: 'me',
        date: 'Yesterday',
        diffs: [],
      })
    }).toThrow('Expected attribute "date" to be formatted as an ISO 8061 date')
  })
})

describe('createDiff', () => {
  it('Creates an AddItem', () => {
    createDiff({
      type: ADD_ITEM,
      item: {
        name: 'loser Pfefferminztee',
        category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
        id: 'cbda3946-f136-4c94-8280-4931100576b4',
        amount: null,
      },
    })
  })

  it('Creates an UpdateItem', () => {
    createDiff({
      type: UPDATE_ITEM,
      oldItem: {
        name: 'Dosen Kichererbsen',
        category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
        amount: {
          value: 2,
        },
        id: 'c14ef9de-3075-445e-9225-6a50e0c0adca',
      },
      item: {
        name: 'Dose Kichererbsen',
        category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
        amount: {
          value: 1,
        },
        id: 'c14ef9de-3075-445e-9225-6a50e0c0adca',
      },
    })
  })

  it('Creates a DeleteItem', () => {
    createDiff({
      type: DELETE_ITEM,
      oldItem: {
        name: 'Dosen Kichererbsen',
        category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
        amount: {
          value: 2,
        },
        id: 'c14ef9de-3075-445e-9225-6a50e0c0adca',
      },
    })
  })

  it('Throws for unknown diff types', () => {
    expect(() => {
      createDiff({
        type: 'Yer mom!',
      })
    }).toThrow(`Unknown diff type Yer mom!`)
  })
})

describe('diffShoppingLists', () => {
  it('Recognizes addition', () => {
    const originalDiff = generateAddItem(
      createItem({
        name: 'loser Pfefferminztee',
        category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
        id: 'cbda3946-f136-4c94-8280-4931100576b4',
        amount: null,
      })
    )
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })

  it('Recognizes update', () => {
    const originalDiff = generateUpdateItem(
      shoppingList,
      createItem({
        name: 'Gemüse',
        category: '6ca0f054-209c-46c9-b337-6088f7a530ab',
        id: 'cee268a4-7506-4000-a740-5c98e50809c6',
        amount: {
          value: 5,
        },
      })
    )
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })

  it('Recognizes delete', () => {
    const originalDiff = generateDeleteItem(shoppingList, createUUID('69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd'))
    const newShoppingList = applyDiff(shoppingList, originalDiff)
    const diffs = diffShoppingLists(shoppingList, newShoppingList)
    expect(diffs).toHaveLength(1)
    expect(diffs).toContainEqual(originalDiff)
  })
})

describe('applyDiff', () => {
  it('Applies an ADD_ITEM diff', () => {
    const item = createItem({
      name: 'loser Pfefferminztee',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: 'cbda3946-f136-4c94-8280-4931100576b4',
      amount: null,
    })
    const result = applyDiff(shoppingList, generateAddItem(item))
    expect(result.items).toContainEqual(item)
  })

  it("Doesn't apply ADD_ITEM if item with id already exists", () => {
    const item = createItem({
      name: 'Kaffeebohnen',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: '69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd',
    })
    expect(() => {
      applyDiff(shoppingList, generateAddItem(item))
    }).toThrow(`Can't apply diff, there already exists an item with id ${item.id}`)
  })

  it('Applies a UPDATE_ITEM diff', () => {
    const result = applyDiff(shoppingList, generateDeleteItem(shoppingList, createUUID('69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd')))
    expect(result.items).toHaveLength(2)
  })

  it('Applies a DELETE_ITEM diff', () => {
    const result = applyDiff(shoppingList, generateDeleteItem(shoppingList, createUUID('69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd')))
    expect(result.items).toHaveLength(2)
  })

  it("Doesn't apply DELETE_ITEM if item doesn't exit", () => {
    // we don't use generateDeleteItem, because we need an invalid diff
    const deleteItemDiff: DeleteItem = {
      type: DELETE_ITEM,
      oldItem: createItem({
        name: 'loser Pfefferminztee',
        category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
        id: 'cbda3946-f136-4c94-8280-4931100576b4',
        amount: null,
      }),
    }
    expect(() => {
      applyDiff(shoppingList, deleteItemDiff)
    }).toThrow(`Can't apply diff, old item not found in list`)
  })
})

describe('generateUpdateItem', () => {
  it("Doesn't create an update if the item didn't exist before", () => {
    const item = createItem({
      name: 'loser Pfefferminztee',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: 'cbda3946-f136-4c94-8280-4931100576b4',
      amount: null,
    })
    expect(() => {
      generateUpdateItem(shoppingList, item)
    }).toThrow(`Can't create update for item with id ${item.id}, it doesn't exist in list.`)
  })

  it("Doesn't create an update if nothing was changed", () => {
    const item = createItem({
      name: 'Dosen Kichererbsen',
      category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
      amount: {
        value: 2,
      },
      id: 'c14ef9de-3075-445e-9225-6a50e0c0adca',
    })
    expect(() => {
      generateUpdateItem(shoppingList, item)
    }).toThrow(`Can't create update for item with id ${item.id}, it is unchanged in the list.`)
  })

  it("Doesn't create an update if a key was changed from not defined to undefined", () => {
    const item = createItem({
      name: 'Kaffeebohnen',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: '69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd',
      amount: undefined,
    })
    expect(() => {
      generateUpdateItem(shoppingList, item)
    }).toThrow(`Can't create update for item with id ${item.id}, it is unchanged in the list.`)
  })
})

describe('isDiffApplicable', () => {
  it('Returns true for applicable diff', () => {
    const item = createItem({
      name: 'loser Pfefferminztee',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: 'cbda3946-f136-4c94-8280-4931100576b4',
      amount: null,
    })
    const diff = generateAddItem(item)
    expect(isDiffApplicable(shoppingList, diff)).toBe(true)
  })

  it('Returns false for non-applicable diff', () => {
    const item = createItem({
      name: 'Kaffeebohnen',
      category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
      id: '69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd',
    })
    const diff = generateAddItem(item)
    expect(isDiffApplicable(shoppingList, diff)).toBe(false)
  })
})

describe('createReverseDiff', () => {
  const oldItem = {
    name: 'loser Pfefferminztee',
    category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
    id: 'cbda3946-f136-4c94-8280-4931100576b4',
    amount: null,
  }
  const item = {
    name: 'loser Pfefferminztee',
    category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
    id: 'cbda3946-f136-4c94-8280-4931100576b4',
    amount: {
      value: 5,
    },
  }
  it('Creates reverse diff for AddItem', () => {
    const diff = createDiff({
      type: ADD_ITEM,
      item: item,
    })
    expect(createReverseDiff(diff)).toEqual(
      createDiff({
        type: DELETE_ITEM,
        oldItem: item,
      })
    )
  })

  it('Creates reverse diff for UpdateItem', () => {
    const diff = createDiff({
      type: UPDATE_ITEM,
      oldItem: oldItem,
      item: item,
    })
    expect(createReverseDiff(diff)).toEqual(
      createDiff({
        type: UPDATE_ITEM,
        oldItem: item,
        item: oldItem,
      })
    )
  })

  it('Creates reverse diff for DeleteItem', () => {
    const diff = createDiff({
      type: DELETE_ITEM,
      oldItem: oldItem,
    })
    expect(createReverseDiff(diff)).toEqual(
      createDiff({
        type: ADD_ITEM,
        item: oldItem,
      })
    )
  })
})
