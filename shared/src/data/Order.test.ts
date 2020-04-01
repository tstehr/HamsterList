/* eslint-env jest */
import { createOrder, sortItems, completeCategoryOrder } from './Order'
import { createItem } from './Item'
import { Item } from './Item'
import { createCategoryDefinition } from './CategoryDefinition'
import { CategoryDefinition } from './CategoryDefinition'
import { sortCategories } from './Order'

describe('createOrder', () => {
  it('Creates an order from a valid spec', () => {
    createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
    })
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
  const order = createOrder({
    id: '579562a4-8be6-464c-9011-e87042b6241b',
    name: 'real',
    categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
  })

  it('Sorts items', () => {
    const sortedItems = sortItems(items, order.categoryOrder)
    expect(sortedItems).toHaveLength(4)
    expect(sortedItems[0].name).toEqual('Steak')
    expect(sortedItems[1].name).toEqual('Eier')
    expect(sortedItems[2].name).toEqual('Käse')
    expect(sortedItems[3].name).toEqual('Unbekanntes Zeug')
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
  const order = createOrder({
    id: '579562a4-8be6-464c-9011-e87042b6241b',
    name: 'real',
    categoryOrder: ['8178a592-7783-4755-9202-8e463ab23234', '6301d82f-0e69-4d57-9473-ab7633089b2c'],
  })

  it('Adds missing categories', () => {
    const completedCategoryOrder = completeCategoryOrder(order.categoryOrder, categories)
    expect(completedCategoryOrder).toEqual([
      '8178a592-7783-4755-9202-8e463ab23234',
      '6301d82f-0e69-4d57-9473-ab7633089b2c',
      '0714a4ab-b653-4266-841f-2fa12291fef8',
    ])
  })
})
