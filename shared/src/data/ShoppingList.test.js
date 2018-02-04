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
