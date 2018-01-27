// @flow
import { setToken, validateToken } from './token'

it('', () => {
  const list = setToken({
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
  expect(validateToken({
    id: "ads",
    title: "hi",
    token: "d5b05fda6e91b98b2916c01310fff4afcb05f7f4147fb969edbab9db1027933f",
    items: []
  })).toBe(true)
})

it('', () => {
  expect(validateToken({
    id: "ads",
    title: "hihi",
    token: "d5b05fda6e91b98b2916c01310fff4afcb05f7f4147fb969edbab9db1027933f",
    items: []
  })).toBe(false)
})
