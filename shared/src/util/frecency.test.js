// @flow
/* eslint-env jest */
import MockDate from 'mockdate'
import { frecency } from './frecency'

beforeAll(() => {
  MockDate.set("2019-06-01T12:00:00.000Z")
})

afterAll(() => {
  MockDate.reset()
})

it("Calculates a frecency", () => {
  expect(
    frecency({
      lastUsedTimestamp: new Date("2019-06-01T11:59:00.000Z").getTime(),
      uses: 1,
    })
  ).toEqual(1)
})

it("Calculates a frecency with longer timespan", () => {
  expect(
    frecency({
      lastUsedTimestamp: new Date("2019-06-01T11:50:00.000Z").getTime(),
      uses: 100,
    })
  ).toEqual(10)
})