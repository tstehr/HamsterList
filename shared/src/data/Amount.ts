import deepFreeze from 'deep-freeze'
import escapeStringRegexp from 'escape-string-regexp'
import _ from 'lodash'
import * as mathjs from 'mathjs'
import { checkAttributeType, checkKeys, endValidation, nullSafe } from '../util/validation'

export type Unit = string
// TODO implement opaque type: https://codemix.com/opaque-types-in-javascript/
export type AmountValue = number

export interface Amount {
  readonly value: AmountValue
  readonly unit: Unit | undefined | null
}

mathjs.createUnit('tbsp', {
  definition: '1 tablespoon',
  aliases: ['EL'],
})
mathjs.createUnit('tsp', {
  definition: '1 teaspoon',
  aliases: ['TL'],
})

export function createUnit(unitSpec: string): Unit {
  const unit = unitSpec.trim() // check if mathjs considers it a valid unit (will throw if not)

  mathjs.unit(unit)
  return unit
}

export function createAmountValue(valueSpec: number): AmountValue {
  if (Number.isNaN(valueSpec)) {
    throw new TypeError('AmountValue may not be NaN')
  }

  if (!Number.isFinite(valueSpec)) {
    throw new TypeError('AmountValue must be finite')
  }

  return valueSpec
}

export function createAmount(amountSpec: unknown): Amount {
  if (
    checkKeys(amountSpec, ['value', 'unit']) &&
    checkAttributeType(amountSpec, 'value', 'number') &&
    checkAttributeType(amountSpec, 'unit', 'string', true)
  ) {
    const amount: Amount = {
      value: createAmountValue(amountSpec.value),
      unit: nullSafe(createUnit)(amountSpec.unit),
    }

    return deepFreeze(amount)
  }
  endValidation()
}

const unicodeVulgarFractions = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅐': '1/7',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
  '⅑': '1/9',
  '⅒': '1/10',
}

const amountStringTransformations = [
  // comma as decimal seperator and semicolon as argument seperator
  (amountString: string): string => amountString.replace(/,|;/g, (match) => (match == ',' ? '.' : ',')),

  // replace unicode vulgar fractions
  (amountString: string): string => mapReplace(amountString, unicodeVulgarFractions),

  // replace possible mixed fractions with implicit addition
  // see https://github.com/josdejong/mathjs/issues/731
  (amountString: string): string => amountString.replace(/(\d+)\s+(\d+)\/(\d+)/, '($1 + $2/$3)'),
]
const amountStringTransformationCombinations = powerSet(amountStringTransformations)

export function createAmountFromString(amountString: string): Amount {
  // We store the error that occured during the first try and throw that in the end as it would
  // be confusing to receive the error for a transformed version.
  let initialError: Error | null = null

  for (const transformationCombination of amountStringTransformationCombinations) {
    const modAmountString: string = transformationCombination.reduce((memo, transformation) => transformation(memo), amountString)

    try {
      const evalResult = mathjs.evaluate(modAmountString)
      return mathjsValueToAmount(evalResult)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!initialError) {
        initialError = e
      }
    }
  }

  if (initialError) {
    throw initialError
  } else {
    throw TypeError("String couldn't be converted to Amount")
  }
}

export function createCookingAmount(amount: Amount): Amount {
  const mathjsAmount = amountToMathjsValue(amount)

  if (!isMathjsUnit(mathjsAmount)) {
    return amount
  }

  return mathjsValueToAmount(mathjsUnitToCookingMathjsUnit(mathjsAmount))
}

export function mergeAmounts(base?: Amount | null, client?: Amount | null, server?: Amount | null): Amount | undefined | null {
  if (_.isEqual(base, client)) {
    return server
  }

  if (_.isEqual(base, server)) {
    return client
  }

  return mergeAmountsTwoWay(client, server)
}

export function mergeAmountsTwoWay(client?: Amount | null, server?: Amount | null): Amount | undefined | null {
  const mathjsClient = amountToMathjsValue(client)
  const mathjsServer = amountToMathjsValue(server)

  try {
    if (mathjs.compare(mathjsClient, mathjsServer) > 0) {
      return client
    } else {
      return server
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return client
  }
}

export function getSIUnit(amount: Amount): string | null {
  const mathjsValue = amountToMathjsValue(amount)

  if (isMathjsUnit(mathjsValue)) {
    return mathjsValue.toSI().formatUnits()
  } else {
    return null
  }
}

export function addAmounts(a1?: Amount | null, a2?: Amount | null): Amount {
  const mv1 = amountToMathjsValue(a1)
  const mv2 = amountToMathjsValue(a2)
  const mres = mathjs.add(mv1, mv2)
  const normalizedResult = isMathjsUnit(mres) ? mathjsUnitToCookingMathjsUnit(mres) : mres
  return mathjsValueToAmount(normalizedResult)
}

type MathjsValue = mathjs.MathType

function mathjsValueToAmount(mathjsValue: MathjsValue): Amount {
  if (isMathjsUnit(mathjsValue)) {
    const unit = mathjsValue.formatUnits()
    return {
      value: createAmountValue(mathjsValue.toJSON().value),
      unit,
    }
  }

  if (isMathjsFraction(mathjsValue)) {
    return mathjsValueToAmount(mathjs.number(mathjsValue))
  }

  let value: number
  if (typeof mathjsValue === 'number') {
    value = createAmountValue(mathjsValue)
  } else if (isMathjsBigNumber(mathjsValue)) {
    value = createAmountValue(mathjsValue.toNumber())
  } else {
    throw new TypeError('Argument is not a mathjs value that can be converted to Amount')
  }
  return {
    value: createAmountValue(value),
    unit: undefined,
  }
}

function amountToMathjsValue(amount: Amount | undefined | null): MathjsValue {
  if (amount == null) {
    return 1
  }

  if (amount.unit != null) {
    return mathjs.unit(amount.value, amount.unit)
  }

  return amount.value
}

function mathjsUnitToCookingMathjsUnit(mathjsUnit: mathjs.Unit): mathjs.Unit {
  let cooking

  if (mathjsUnit.equalBase(mathjs.unit('l'))) {
    cooking = mathjs.unit(mathjsUnit.to('l').toString())
  } else if (mathjsUnit.equalBase(mathjs.unit('kg'))) {
    cooking = mathjs.unit(mathjsUnit.to('kg').toString())
  } else {
    cooking = mathjsUnit
  }

  // make mathjs choose a suitable prefix automagically
  const prefixed = mathjs.unit(cooking.toString())
  return prefixed
}

export function mapReplace(
  str: string,
  replacements: {
    [x: string]: string
  },
): string {
  const regexpStr = Object.keys(replacements)
    .map((r) => escapeStringRegexp(r))
    .join('|')
  return str.replace(RegExp(regexpStr, 'g'), (match) => replacements[match])
}

export function powerSet<T>(list: T[]): T[][] {
  const resultLength = 2 ** list.length
  const result = []

  for (let i = 0; i < resultLength; i++) {
    // bit pattern of index determines which elements are included
    result.push(list.filter((el, elIndex) => i & (1 << elIndex)))
  }

  return result
}

function isMathjsUnit(value: unknown): value is mathjs.Unit {
  return mathjs.typeOf(value) === 'Unit'
}

function isMathjsBigNumber(value: unknown): value is mathjs.BigNumber {
  return mathjs.typeOf(value) === 'BigNumber'
}

function isMathjsFraction(value: unknown): value is mathjs.Fraction {
  return mathjs.typeOf(value) === 'Fraction'
}
