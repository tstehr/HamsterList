import _ from 'lodash'

interface TypeMap {
  // can also be a type
  object: Record<string, unknown>
  string: string
  number: number
  boolean: boolean
  array: unknown[]
}

type AttributeType = keyof TypeMap

export function isIndexable(object: unknown): object is Record<string, unknown> {
  return _.isObject(object)
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getLiteralKeys<O extends {}>(object: O): readonly (keyof O)[] {
  // This is technically only a retyping of Object.keys
  return Object.keys(object) as (keyof O)[]
}

export function checkKeys<T extends string>(object: unknown, expectedKeys: T[]): object is { [K in T]?: unknown } {
  if (!_.isObject(object)) {
    throw new TypeError('Given value must be an object')
  }

  const keys = Object.keys(object)

  const unexpectedKeys = _.difference(keys, expectedKeys)

  if (unexpectedKeys.length > 0) {
    throw new TypeError(`Given object contained unexpected keys: ${unexpectedKeys.toString()}`)
  }
  return true
}

export function checkAttributeType<T extends AttributeType, K extends string, O extends { [P in K]?: unknown }>(
  object: O,
  key: K,
  type: T,
): object is O & { [P in K]: TypeMap[T] }
export function checkAttributeType<T extends AttributeType, K extends string, O extends { [P in K]?: unknown }>(
  object: O,
  key: K,
  type: T,
  optional: true,
): object is O & { [P in K]?: TypeMap[T] }
export function checkAttributeType<T extends AttributeType, K extends string, O extends { [P in K]: unknown }>(
  object: O,
  key: K,
  type: T,
  optional = false,
): boolean {
  if (!optional && object[key] == null) {
    throw new TypeError(`Given object must have an attribute "${key}"`)
  }

  const actualType = getAttributeType(object[key])

  if (actualType !== type && !(optional && object[key] == null)) {
    throw new TypeError(`Expected attribute "${key}" to be of type "${type}" but is of type "${actualType}" instead`)
  }
  return true
}

/* istanbul ignore next */
export function endValidation(): never {
  // this should be unreachable
  throw TypeError('Given object is invalid!')
}

export function errorMap<I, O>(array: readonly I[], transformer: (a: I) => O): readonly O[] {
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

export function nullSafe<T, R>(func: (a: T) => R): (a: T | undefined | null) => R | undefined | null {
  return function (p: T | undefined | null): R | undefined | null {
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
  if (_.isObject(o)) {
    const indexableO = o as Record<string, unknown>
    for (const identificationField of IDENTIFICATION_FIELDS) {
      const value = indexableO[identificationField]
      if (typeof value === 'string') {
        return `${identificationField}="${value}"`
      }
    }
  }

  if (typeof o === 'string') {
    return `"${o}"`
  }

  return null
}

function getAttributeType(attribute: unknown): string {
  if (Array.isArray(attribute)) {
    return 'array'
  } else {
    return typeof attribute
  }
}
