// @flow


import jest from 'jest'
import { createOrder, sortItems } from './Order'
import { type Item, createItem } from './Item';
import { createUUID } from '../util/uuid';

describe('createOrder', () => {
  it('Creates an order from a valid spec', () => {
    const order = createOrder({
      id: '579562a4-8be6-464c-9011-e87042b6241b',
      name: 'real',
      categoryOrder: [
        "8178a592-7783-4755-9202-8e463ab23234",
        "6301d82f-0e69-4d57-9473-ab7633089b2c"
      ]
    })
  })

  it(`Doesn't create an order with additional keys`, () => {
    expect(() => {
      createOrder({
        id: '579562a4-8be6-464c-9011-e87042b6241b',
        name: 'real',
        categoryOrder: [
          "8178a592-7783-4755-9202-8e463ab23234",
          "6301d82f-0e69-4d57-9473-ab7633089b2c"
        ],
        a: "test"
      })
    }).toThrow('Given object contained unexpected keys: a')
  })
})

describe('sortItems', () => {
  const items: Item[] = [
    createItem({
      id: "d2238c35-4298-45f4-93ec-bca9afec5b94",
      name: "Unbekanntes Zeug"
    }),
    createItem({
      id: "94d9ff44-721d-4125-ba76-a4a095f922d3",
      name: "Käse",
      category: "6301d82f-0e69-4d57-9473-ab7633089b2c"
    }),
    createItem({
      id: "2080b598-db4f-4d93-8b48-b09ed5bb63e8",
      name: "Eier",
      category: "6301d82f-0e69-4d57-9473-ab7633089b2c"
    }),
    createItem({
      id: "7ddf836d-3afb-4058-843a-e0ad641ea7f7",
      name: "Steak",
      category: "8178a592-7783-4755-9202-8e463ab23234"
    })
  ]

  const order = createOrder({
    id: '579562a4-8be6-464c-9011-e87042b6241b',
    name: 'real',
    categoryOrder: [
      "8178a592-7783-4755-9202-8e463ab23234",
      "6301d82f-0e69-4d57-9473-ab7633089b2c"
    ]
  })

  it('Sorts items', () => {
    const sortedItems = sortItems(items, order.categoryOrder)
    expect(sortedItems[0].name).toEqual("Steak")
    expect(sortedItems[1].name).toEqual("Eier")
    expect(sortedItems[2].name).toEqual("Käse")
    expect(sortedItems[3].name).toEqual("Unbekanntes Zeug")
  })

})