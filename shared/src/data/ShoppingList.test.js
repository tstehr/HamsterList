// @flow

import jest from 'jest'
import { createUUID } from '../util/uuid'
import { type ShoppingList, createShoppingList, mergeShoppingLists } from './ShoppingList'
import { createLocalItemFromString } from './Item'


it('Creates a simple object', () => {
  const list = createShoppingList({
    id: 'mylist',
    title: "Aquarium",
    items: []
  }, [])
})


describe('mergeShoppingLists', () => {

  const id = createUUID("a58df112-085f-4742-873d-8f8e31af7826")

  it('Prefers changed title client', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: []
    }
    const client = {...base, title: 'Clienttitle'}
    const server = base
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(client)
  })

  it('Prefers changed title server', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: []
    }
    const client = base
    const server = {...base, title: 'Servertitle'}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(server)
  })

  it('Prefers client title when both changed', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: []
    }
    const client = {...base, title: 'Clientitle'}
    const server = {...base, title: 'Servertitle'}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(client)
  })

  it('Merges items', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: [{...createLocalItemFromString('1 Ei', []), id: id}]
    }
    const client = {...base, items: [{...createLocalItemFromString('6 Eier', []), id: id}]}
    const server = {...base, items: [{...createLocalItemFromString('2 Eier (Bio)', []), id: id}]}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual({...base, items: [{...createLocalItemFromString('6 Eier (Bio)', []), id: id}]})
  })

  it('Handles delete on both', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: [{...createLocalItemFromString('1 Ei', []), id: id}]
    }
    const client = {...base, items: []}
    const server = {...base, items: []}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(server)
  })

  it('Handles delete on server', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: [{...createLocalItemFromString('1 Ei', []), id: id}]
    }
    const client = base
    const server = {...base, items: []}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(server)
  })

  it('Handles delete on client and change on server ', () => {
    const base = {
      id: 'mylist',
      title: "Basetitle",
      items: [{...createLocalItemFromString('1 Ei', []), id: id}]
    }
    const client = {...base, items: []}
    const server = {...base, items: [{...createLocalItemFromString('6 Eier', []), id: id}]}
    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual(server)
  })

  it('Merges when id is not in base but in client and server', () => {
    const base = createShoppingList({
      "id": "Unterwegs",
      "title": "Unterwegs",
      "items": [
        {
          "name": "Gemüse",
          "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
          "id": "cee268a4-7506-4000-a740-5c98e50809c6"
        },
        {
          "name": "Frischkäse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "0ac3c795-1341-4838-b729-5053720e80ef"
        },
        {
          "name": "Käse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "31005250-595c-4fc9-b27a-d4ec33b85271"
        },
        {
          "name": "MiniMilk",
          "category": "b68d25e8-5fa0-4f83-9408-6c306ddb8c21",
          "id": "f8ba8c9f-e4a1-4625-bd3d-20252c773b54"
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
        },
        {
          "name": "loser Pfefferminztee",
          "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
          "id": "cbda3946-f136-4c94-8280-4931100576b4"
        }
      ]
    }, [])
    const server = createShoppingList({
      "id": "Unterwegs",
      "title": "Unterwegs",
      "items": [
        {
          "name": "Gemüse",
          "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
          "id": "cee268a4-7506-4000-a740-5c98e50809c6"
        },
        {
          "name": "Frischkäse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "0ac3c795-1341-4838-b729-5053720e80ef"
        },
        {
          "name": "Käse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "31005250-595c-4fc9-b27a-d4ec33b85271"
        },
        {
          "name": "MiniMilk",
          "category": "b68d25e8-5fa0-4f83-9408-6c306ddb8c21",
          "id": "1ccf57f6-5452-4de4-8e04-b908a4144158"
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
        },
        {
          "name": "loser Pfefferminztee",
          "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
          "id": "cbda3946-f136-4c94-8280-4931100576b4"
        },
        {
          "name": "Knoblauch",
          "id": "5d0d6c63-67d4-4f3f-8c00-540823e0476c"
        }
      ]
    }, [])
    const client = createShoppingList({
      "id": "Unterwegs",
      "title": "Unterwegs",
      "items": [
        {
          "name": "Gemüse",
          "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
          "id": "cee268a4-7506-4000-a740-5c98e50809c6"
        },
        {
          "name": "Knoblauch",
          "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
          "id": "5d0d6c63-67d4-4f3f-8c00-540823e0476c"
        },
        {
          "name": "Petersilie",
          "category": "6ca0f054-209c-46c9-b337-6088f7a530ab",
          "id": "5b8f0e0e-6663-4f0a-abe8-dbb7f9784579"
        },
        {
          "name": "Frischkäse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "0ac3c795-1341-4838-b729-5053720e80ef"
        },
        {
          "name": "Käse",
          "category": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
          "id": "31005250-595c-4fc9-b27a-d4ec33b85271"
        },
        {
          "name": "MiniMilk",
          "category": "b68d25e8-5fa0-4f83-9408-6c306ddb8c21",
          "id": "f8ba8c9f-e4a1-4625-bd3d-20252c773b54"
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
        },
        {
          "name": "loser Pfefferminztee",
          "category": "1508d447-3e0d-4b50-bcae-ae4a9c85a3ea",
          "id": "cbda3946-f136-4c94-8280-4931100576b4"
        }
      ]
    }, [])

    const result = mergeShoppingLists(base, client, server, [])
    expect(result).toEqual({
      id: 'Unterwegs',
      title: 'Unterwegs',
      items: [{
          name: 'Dosen Kichererbsen',
          category: 'bef7bffc-6f54-450a-804e-799d1da5b976',
          amount: {
            value: 2,
            unit: undefined,
          },
          id: 'c14ef9de-3075-445e-9225-6a50e0c0adca'
        },
        {
          name: 'Frischkäse',
          category: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
          amount: undefined,
          id: '0ac3c795-1341-4838-b729-5053720e80ef'
        },
        {
          name: 'Gemüse',
          category: '6ca0f054-209c-46c9-b337-6088f7a530ab',
          amount: undefined,
          id: 'cee268a4-7506-4000-a740-5c98e50809c6'
        },
        {
          name: 'Kaffeebohnen',
          category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
          amount: undefined,
          id: '69fab191-4a93-41a5-a7c0-2a1b2ae2dcbd'
        },
        {
          name: "Knoblauch",
          category: "6ca0f054-209c-46c9-b337-6088f7a530ab",
          amount: undefined,
          id: "5d0d6c63-67d4-4f3f-8c00-540823e0476c"
        },
        {
          name: 'Käse',
          category: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
          amount: undefined,
          id: '31005250-595c-4fc9-b27a-d4ec33b85271'
        },
        {
          name: 'loser Pfefferminztee',
          category: '1508d447-3e0d-4b50-bcae-ae4a9c85a3ea',
          amount: undefined,
          id: 'cbda3946-f136-4c94-8280-4931100576b4'
        },
        {
          name: "MiniMilk",
          category: "b68d25e8-5fa0-4f83-9408-6c306ddb8c21",
          amount: undefined,
          id: "1ccf57f6-5452-4de4-8e04-b908a4144158",
        },
        {
          name: "Petersilie",
          category: "6ca0f054-209c-46c9-b337-6088f7a530ab",
          amount: undefined,
          id: "5b8f0e0e-6663-4f0a-abe8-dbb7f9784579",
        },
      ]
    })
  })

  // it('Prefers client item', () => {
  //   const base = {
  //     id: 'mylist',
  //     title: "Title",
  //     items: [
  //
  //     ]
  //   }
  //   const client = {
  //     id: 'mylist',
  //     title: "Title",
  //     items: []
  //   }
  //   const server = {
  //     id: 'mylist',
  //     title: "Title",
  //     items: []
  //   }
  //   const result = mergeShoppingLists(base, client, server, [])
  //   expect(result).toEqual({
  //     id: 'mylist',
  //     title: "Title",
  //     items: []
  //   })
  // })
})
