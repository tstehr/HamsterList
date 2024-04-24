import { describe, expect, it } from 'vitest'
import { createRandomUUID, createUUID, createUUIDFromUnknown } from './uuid.js'

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

describe('createUUIDFromUnknown', () => {
  it('Creates a valid uuid', () => {
    createUUIDFromUnknown('19b3c849-a014-437f-b19f-c7607bbb4dd7')
  })

  it(`Doesn't create a uuid from invalid input`, () => {
    expect(() => {
      createUUIDFromUnknown('Look ma, no UUID')
    }).toThrow()
  })

  it(`Doesn't create a uuid from anything that is not a string`, () => {
    expect(() => {
      createUUIDFromUnknown(1)
    }).toThrow()
  })
})
