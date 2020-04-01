import _ from 'lodash'
import mathjs from 'mathjs'
import deepFreeze from 'deep-freeze'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'
import escapeStringRegexp from 'escape-string-regexp'
export type Unit = string
export type AmountValue = number
export type Amount = {
  readonly value: AmountValue
  readonly unit: Unit | undefined | null
  [x: any]: never
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
export function createAmount(amountSpec: any): Amount {
  checkKeys(amountSpec, ['value', 'unit'])
  checkAttributeType(amountSpec, 'value', 'number')
  checkAttributeType(amountSpec, 'unit', 'string', true)
  const amount = {}
  amount.value = createAmountValue(amountSpec.value)
  amount.unit = nullSafe(createUnit)(amountSpec.unit)
  return deepFreeze(amount)
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
  (amountString) => amountString.replace(/,|;/g, (match) => (match == ',' ? '.' : ',')), // replace unicode vulgar fractions
  (amountString) => mapReplace(amountString, unicodeVulgarFractions), // replace possible mixed fractions with implicit addition
  // see https://github.com/josdejong/mathjs/issues/731
  (amountString) => amountString.replace(/(\d+)\s+(\d+)\/(\d+)/, '($1 + $2/$3)'),
]
const amountStringTransformationCombinations = powerSet(amountStringTransformations)
export function createAmountFromString(amountString: string): Amount {
  // We store the error that occured during the first try and throw that in the end as it would
  // be confusing to receive the error for a transformed version.
  let initialError: Error | undefined | null = null

  for (const transformationCombination of amountStringTransformationCombinations) {
    const modAmountString: string = transformationCombination.reduce((memo, transformation) => transformation(memo), amountString)

    try {
      let evalResult = mathjs.eval(modAmountString)
      return mathjsValueToAmount(evalResult)
    } catch (e) {
      if (!initialError) {
        initialError = e
      }
    }
  }

  throw initialError
}
export function createCookingAmount(amount: Amount): Amount {
  const mathjsAmount = amountToMathjsValue(amount)

  if (!(mathjsAmount instanceof mathjs.type.Unit)) {
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
  let mathjsClient = amountToMathjsValue(client)
  let mathjsServer = amountToMathjsValue(server)

  try {
    if (mathjs.compare(mathjsClient, mathjsServer) > 0) {
      return client
    } else {
      return server
    }
  } catch (e) {
    return client
  }
}
export function getSIUnit(amount: Amount) {
  const mathjsValue = amountToMathjsValue(amount)

  if (mathjsValue instanceof mathjs.type.Unit) {
    return mathjsValue.toSI().toJSON().unit
  } else {
    return null
  }
}
export function addAmounts(a1?: Amount | null, a2?: Amount | null) {
  const mv1 = amountToMathjsValue(a1)
  const mv2 = amountToMathjsValue(a2)
  const mres = mathjs.add(mv1, mv2)
  const normalizedResult = mres instanceof mathjs.type.Unit ? mathjsUnitToCookingMathjsUnit(mres) : mres
  return mathjsValueToAmount(normalizedResult)
}
type MathjsValue = mathjs.type.Unit | mathjs.type.BigNumber | mathjs.type.Fraction | number

function toNumber(mathjsValue: MathjsValue): number {
  if (
    mathjsValue instanceof mathjs.type.Unit ||
    mathjsValue instanceof mathjs.type.BigNumber ||
    mathjsValue instanceof mathjs.type.Fraction
  ) {
    return mathjsValue.toNumber()
  } else if (typeof mathjsValue === 'number') {
    return mathjsValue
  } else {
    throw new TypeError('Argument is not a mathjs value')
  }
}

function mathjsValueToAmount(mathjsValue: MathjsValue): Amount {
  return createAmount({
    value: toNumber(mathjsValue),
    unit: mathjsValue instanceof mathjs.type.Unit ? mathjsValue.toJSON().unit : undefined,
  })
}

function amountToMathjsValue(amount?: Amount | null): MathjsValue {
  if (amount == null) {
    return 1
  }

  if (amount.unit != null) {
    return mathjs.unit(amount.value, amount.unit)
  }

  return amount.value
}

function mathjsUnitToCookingMathjsUnit(mathjsUnit: mathjs.type.Unit): mathjs.type.Unit {
  let cooking

  if (mathjsUnit.equalBase(mathjs.unit('l'))) {
    cooking = mathjs.unit(mathjsUnit.to('l').toString())
  } else if (mathjsUnit.equalBase(mathjs.unit('kg'))) {
    cooking = mathjs.unit(mathjsUnit.to('kg').toString())
  } else {
    cooking = mathjsUnit
  } // make mathjs choose a suitable prefix automagically

  const prefixed = mathjs.unit(cooking.toString())
  return prefixed
}

export function mapReplace(
  str: string,
  replacements: {
    [x: string]: string
  }
) {
  const regexpStr = Object.keys(replacements)
    .map((r) => escapeStringRegexp(r))
    .join('|')
  return str.replace(RegExp(regexpStr, 'g'), (match) => replacements[match])
}
export function powerSet<T>(list: Array<T>): Array<Array<T>> {
  const resultLength = 2 ** list.length
  const result = []

  for (let i = 0; i < resultLength; i++) {
    // bit pattern of index determines which elements are included
    result.push(list.filter((el, elIndex) => i & (1 << elIndex)))
  }

  return result
}
