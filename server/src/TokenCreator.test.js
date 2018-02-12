// @flow
import TokenCreator from './TokenCreator'
import jest from 'jest'

const tokenCreator = new TokenCreator("123")


it('', () => {
  const list = tokenCreator.setToken({
    id: "ads",
    title: "hi",
    token: "",
    items: []
  })
  expect(list).toEqual({
    id: "ads",
    title: "hi",
    token: "d5b05fda6e91b98b2916c01310fff4afcb05f7f4147fb969edbab9db1027933f",
    items: []
  })
})

it('', () => {
  expect(tokenCreator.validateToken({
    id: "ads",
    title: "hi",
    token: "d5b05fda6e91b98b2916c01310fff4afcb05f7f4147fb969edbab9db1027933f",
    items: []
  })).toBe(true)
})

it('', () => {
  expect(tokenCreator.validateToken({
    id: "ads",
    title: "hihi",
    token: "d5b05fda6e91b98b2916c01310fff4afcb05f7f4147fb969edbab9db1027933f",
    items: []
  })).toBe(false)
})
