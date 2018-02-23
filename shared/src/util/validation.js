// @flow
import _ from 'lodash'

type AttributeType = 'object' | 'boolean' | 'number' | 'string' | 'array'

export function checkKeys(object: mixed, expectedKeys: string[]) {
  if (object === null || typeof object !== 'object') {
    throw new TypeError('Given value must be an object')
  }
  const keys = Object.keys(object)
  const unexpectedKeys = _.difference(keys, expectedKeys)
  if (unexpectedKeys.length > 0) {
    throw new TypeError(`Given object contained unexpected keys: ${unexpectedKeys.toString()}`)
  }
}

export function checkAttributeType(object: Object, key: string, type: AttributeType, optional: boolean = false) {
  if (!optional && object[key] == null) {
    throw new TypeError(`Given object must have an attribute "${key}"`)
  }
  const actualType = getAttributeType(object[key])
  if (actualType !== type && !(optional && object[key] == null)) {
      throw new TypeError(`Expected attribute "${key}" to be of type "${type}" but is of type "${actualType}" instead`)
  }
}

export function errorMap<I, O>(array: I[], transformer: (I) => O): O[] {
  return array.map((el, i) => {
    try {
      return transformer(el)
    } catch (e) {
      throw new TypeError(`Error in element ${i}: ${e.message}`)
    }
  })
}

export function nullSafe<T, R>(func: (T) => R): (?T) => ?R {
  return function(p : ?T) {
    if (p === null) {
      return null
    }
    if (p === undefined) {
      return undefined
    }
    return func(p)
  }
}

function getAttributeType(attribute: any): string {
  if (Array.isArray(attribute)) {
    return 'array'
  } else {
    return typeof attribute
  }
}
