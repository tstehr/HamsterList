/* eslint-env jest */
import { createRandomUUID, createUUID } from '../util/uuid'
import { CategoryDefinition, createCategoryDefinition } from './CategoryDefinition'
import { createItem, Item } from './Item'
import { completeCategoryOrder, createOrder, sortCategories, sortItems, transformOrderToCategories } from './Order'

describe('createOrder', () => {
  it('Creates an order from a valid spec', () => {
    createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
    })
  })

  it('Creates an order that includes null', () => {
    createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c', null],
    })
  })

  it(`Doesn't create an order that includes undefined`, () => {
    expect(() => {
      createOrder({
        id: '579562a4-8be6-464c-9011-e87042b6241b',
        name: 'real',
        categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c', undefined],
      })
    }).toThrow('Error in element 2: The value may not be "undefined"!')
  })

  it(`Doesn't create an order with additional keys`, () => {
    expect(() => {
      createOrder({
        id: '579562a4-8be6-464c-9011-e87042b6241b',
        name: 'real',
        categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
        a: 'test',
      })
    }).toThrow('Given object contained unexpected keys: a')
  })
})

describe('sortItems', () => {
  const items: Item[] = [
    createItem({
      id: 'd2238c35-4298-45f4-93ec-bca9afec5b94',
      name: 'Unbekanntes Zeug',
    }),
    createItem({
      id: '17a638c6-6452-409d-acbe-de10665f91de',
      name: 'Unbekannter Stuff',
    }),
    createItem({
      id: '94d9ff44-721d-4125-ba76-a4a095f922d3',
      name: 'Käse',
      category: '6301d82f-0e69-4d57-9473-ab7633089b2c',
    }),
    createItem({
      id: '2080b598-db4f-4d93-8b48-b09ed5bb63e8',
      name: 'Eier',
      category: '6301d82f-0e69-4d57-9473-ab7633089b2c',
    }),
    createItem({
      id: '7ddf836d-3afb-4058-843a-e0ad641ea7f7',
      name: 'Steak',
      category: '8178a592-7783-4755-9202-8e463ab23234',
    }),
  ]

  it('Sorts items', () => {
    const sortedItems = sortItems(items, ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'])
    expect(sortedItems).toHaveLength(5)
    expect(sortedItems[0].name).toEqual('Steak')
    expect(sortedItems[1].name).toEqual('Eier')
    expect(sortedItems[2].name).toEqual('Käse')
    expect(sortedItems[3].name).toEqual('Unbekannter Stuff')
    expect(sortedItems[4].name).toEqual('Unbekanntes Zeug')
  })

  it('Sorts items with the same category together even if the categories are not in the order', () => {
    const sortedItems = sortItems(items, [])
    expect(sortedItems).toHaveLength(5)
    expect(sortedItems[0].name).toEqual('Eier')
    expect(sortedItems[1].name).toEqual('Käse')
    expect(sortedItems[2].name).toEqual('Steak')
    expect(sortedItems[3].name).toEqual('Unbekannter Stuff')
    expect(sortedItems[4].name).toEqual('Unbekanntes Zeug')
  })
})

describe('sortCategories', () => {
  const categories: CategoryDefinition[] = [
    createCategoryDefinition({
      id: '6301d82f-0e69-4d57-9473-ab7633089b2c',
      name: 'Nicht witzig',
      shortName: 'NW',
      color: 'white',
      lightText: false,
    }),
    createCategoryDefinition({
      id: '8178a592-7783-4755-9202-8e463ab23234',
      name: 'Witzig',
      shortName: 'W',
      color: 'black',
      lightText: true,
    }),
  ]
  const order = createOrder({
    id: '579562a4-8be6-464c-9011-e87042b6241b',
    name: 'real',
    categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
  })

  it('Sorts categories', () => {
    const sortedCategories = sortCategories(categories, order.categoryOrder)
    expect(sortedCategories).toEqual([categories[1], categories[0]])
  })
})

describe('completeCategories', () => {
  const categories: CategoryDefinition[] = [
    createCategoryDefinition({
      id: '0714a4ab-b653-4266-841f-2fa12291fef8',
      name: 'Meh',
      shortName: 'M',
      color: 'grey',
      lightText: true,
    }),
    createCategoryDefinition({
      id: '6301d82f-0e69-4d57-9473-ab7633089b2c',
      name: 'Nicht witzig',
      shortName: 'NW',
      color: 'white',
      lightText: false,
    }),
    createCategoryDefinition({
      id: '8178a592-7783-4755-9202-8e463ab23234',
      name: 'Witzig',
      shortName: 'W',
      color: 'black',
      lightText: true,
    }),
  ]
  it('Adds missing categories', () => {
    const order = createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
    })

    const completedCategoryOrder = completeCategoryOrder(order.categoryOrder, categories)
    expect(completedCategoryOrder).toEqual([
      '8178a592-7783-4755-9202-8e463ab23234',
      '6301d82f-0e69-4d57-9473-ab7633089b2c',
      '0714a4ab-b653-4266-841f-2fa12291fef8',
    ])
  })

  it('Removes unknown categories', () => {
    const order = createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: [
        '8178a592-7783-4755-9202-8e463ab23234',
        '0714a4ab-b653-4266-841f-2fa12291fef8',
        '6301d82f-0e69-4d57-9473-ab7633089b2c',
        '2fd9b8a5-3c1e-4efa-9b95-9cd93d620428',
      ],
    })

    const completedCategoryOrder = completeCategoryOrder(order.categoryOrder, categories)
    expect(completedCategoryOrder).toEqual([
      '8178a592-7783-4755-9202-8e463ab23234',
      '0714a4ab-b653-4266-841f-2fa12291fef8',
      '6301d82f-0e69-4d57-9473-ab7633089b2c',
    ])
  })

  it('Keeps null category', () => {
    const order = createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: [null, '8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
    })

    const completedCategoryOrder = completeCategoryOrder(order.categoryOrder, categories)
    expect(completedCategoryOrder).toEqual([
      null,
      '8178a592-7783-4755-9202-8e463ab23234',
      '6301d82f-0e69-4d57-9473-ab7633089b2c',
      '0714a4ab-b653-4266-841f-2fa12291fef8',
    ])
  })
})

describe('transformOrderToCategories', () => {
  function makeCategory(name: string): CategoryDefinition {
    return {
      name,
      id: createRandomUUID(),
      shortName: name[0].toUpperCase(),
      color: 'black',
      lightText: false,
    }
  }

  const id = createUUID('53c85e0d-ac7b-4a69-a3ea-8a9e1bc04f82')
  const sourceCategories = [makeCategory('CAT1'), makeCategory('CAT2'), makeCategory('CAT3')]
  const sourceOrder = {
    id,
    name: 'The New Jedi Order',
    categoryOrder: [...sourceCategories].reverse().map((c) => c.id),
  }
  const targetCategories = [makeCategory('CAT1'), makeCategory('CAT2'), makeCategory('CAT3')]
  const expectedTargetOrder = {
    id,
    name: 'The New Jedi Order',
    categoryOrder: [...targetCategories].reverse().map((c) => c.id),
  }
  it('Transforms category ids', () => {
    expect(transformOrderToCategories(sourceOrder, sourceCategories, targetCategories)).toEqual(expectedTargetOrder)
  })

  it('Keeps null in order', () => {
    expect(
      transformOrderToCategories(
        { ...sourceOrder, categoryOrder: [...sourceOrder.categoryOrder, null] },
        sourceCategories,
        targetCategories,
      ),
    ).toEqual({
      ...expectedTargetOrder,
      categoryOrder: [...expectedTargetOrder.categoryOrder, null],
    })
  })

  it('Handles order containing id not categories', () => {
    expect(
      transformOrderToCategories(
        { ...sourceOrder, categoryOrder: [...sourceOrder.categoryOrder, createRandomUUID()] },
        sourceCategories,
        targetCategories,
      ),
    ).toEqual({
      ...expectedTargetOrder,
      categoryOrder: [...expectedTargetOrder.categoryOrder],
    })
  })

  it('Completes category order', () => {
    const newCat = makeCategory('NEWCAT')
    const modTargetCategories = [...targetCategories, newCat]

    expect(transformOrderToCategories(sourceOrder, sourceCategories, modTargetCategories)).toEqual({
      ...expectedTargetOrder,
      categoryOrder: [...expectedTargetOrder.categoryOrder, newCat.id],
    })
  })

  it('Ignores unmatched categories', () => {
    const modTargetCategories = targetCategories.slice(0, 2)

    expect(transformOrderToCategories(sourceOrder, sourceCategories, modTargetCategories)).toEqual({
      ...expectedTargetOrder,
      categoryOrder: expectedTargetOrder.categoryOrder.slice(1),
    })
  })
})
