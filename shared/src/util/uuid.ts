import isUUID from 'is-uuid'
import { v4 as uuidv4 } from 'uuid'
export type UUID = string

export function createRandomUUID(): UUID {
  return uuidv4()
}

export function createUUID(uuidStr: string): UUID {
  if (!isUUID.v4(uuidStr)) {
    throw new TypeError(`"${uuidStr}" is not a validUUID`)
  }

  return uuidStr
}

export function createUUIDFromUnknown(uuidSpec: unknown): UUID {
  if (typeof uuidSpec !== 'string') {
    throw TypeError(`Expected type "string", got "${typeof uuidSpec}" instead!`)
  }
  return createUUID(uuidSpec)
}
