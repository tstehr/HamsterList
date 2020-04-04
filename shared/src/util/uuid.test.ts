/* eslint-env jest */
import { createRandomUUID, createUUID } from './uuid'

describe('createsRandomUUID', () => {
  it('Creates a uuid randomly', () => {
    const uuid = createRandomUUID()
    expect(typeof uuid).toBe('string')
    createUUID(uuid)
  })
})

describe('createUUID', () => {
  it('Creates a valid uuid', () => {
    createUUID('19b3c849-a014-437f-b19f-c7607bbb4dd7')
  })

  it(`Doesn't create a uuid from invalid input`, () => {
    expect(() => {
      createUUID('Look ma, no UUID')
    }).toThrow()
  })
})
