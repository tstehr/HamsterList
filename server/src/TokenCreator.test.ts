import { createUUID } from 'shoppinglist-shared'
import { expect, it } from 'vitest'
import TokenCreator from './TokenCreator.js'

const tokenCreator = new TokenCreator('123')
const changeId = createUUID('a58df112-085f-4742-873d-8f8e31af7826')

it('creates token', () => {
  const list = tokenCreator.setToken({
    id: 'ads',
    title: 'hi',
    token: '',
    changeId,
    items: [],
  })
  expect(list).toEqual({
    id: 'ads',
    title: 'hi',
    token: '22a67e2d2d0a223882c2c04b0fd55e61afa903f455800d3bf1ef51e87d9d6b25',
    changeId,
    items: [],
  })
})

it('returns true for correct token', () => {
  expect(
    tokenCreator.validateToken({
      id: 'ads',
      title: 'hi',
      token: '22a67e2d2d0a223882c2c04b0fd55e61afa903f455800d3bf1ef51e87d9d6b25',
      changeId,
      items: [],
    }),
  ).toBe(true)
})

it('returns false for incorrect token', () => {
  expect(
    tokenCreator.validateToken({
      id: 'ads',
      title: 'hihi',
      token: '22a67e2d2d0a223882c2c04b0fd55e61afa903f455800d3bf1ef51e87d9d6b25',
      changeId,
      items: [],
    }),
  ).toBe(false)
})
