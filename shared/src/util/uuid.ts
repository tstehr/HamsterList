import uuidv4 from 'uuid/v4'
import isUUID from 'is-uuid'
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
