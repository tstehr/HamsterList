import _ from 'lodash'
type AttributeType = 'object' | 'boolean' | 'number' | 'string' | 'array'
export function checkKeys(object: unknown, expectedKeys: string[]) {
  if (object === null || typeof object !== 'object') {
    throw new TypeError('Given value must be an object')
  }

  const keys = Object.keys(object)

  const unexpectedKeys = _.difference(keys, expectedKeys)

  if (unexpectedKeys.length > 0) {
    throw new TypeError(`Given object contained unexpected keys: ${unexpectedKeys.toString()}`)
  }
}
export function checkAttributeType(object: any, key: string, type: AttributeType, optional: boolean = false) {
  if (!optional && object[key] == null) {
    throw new TypeError(`Given object must have an attribute "${key}"`)
  }

  const actualType = getAttributeType(object[key])

  if (actualType !== type && !(optional && object[key] == null)) {
    throw new TypeError(`Expected attribute "${key}" to be of type "${type}" but is of type "${actualType}" instead`)
  }
}
export function errorMap<I, O>(array: ReadonlyArray<I>, transformer: (a: I) => O): ReadonlyArray<O> {
  return array.map((el, i) => {
    try {
      return transformer(el)
    } catch (e) {
      const identification = getIdentification(el)

      if (identification != null) {
        throw new TypeError(`Error in element ${i} (${identification}): ${e.message}`)
      } else {
        throw new TypeError(`Error in element ${i}: ${e.message}`)
      }
    }
  })
}
export function nullSafe<T, R>(func: (a: T) => R): (a?: T | null) => R | undefined | null {
  return function (p: T | undefined | null) {
    if (p === null) {
      return null
    }

    if (p === undefined) {
      return undefined
    }

    return func(p)
  }
}
const IDENTIFICATION_FIELDS = Object.freeze(['name', 'title', 'id'])

function getIdentification(o: unknown): string | undefined | null {
  if (o && typeof o === 'object') {
    for (let identificationField of IDENTIFICATION_FIELDS) {
      if (typeof o[identificationField] === 'string') {
        return `${identificationField}="${o[identificationField]}"`
      }
    }
  }

  if (typeof o === 'string') {
    return `"${o}"`
  }

  return null
}

function getAttributeType(attribute: any): string {
  if (Array.isArray(attribute)) {
    return 'array'
  } else {
    return typeof attribute
  }
}
