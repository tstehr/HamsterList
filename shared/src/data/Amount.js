// @flow
import _ from 'lodash'
import mathjs from 'mathjs'
import deepFreeze from 'deep-freeze'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'
import escapeStringRegexp from 'escape-string-regexp'
import powerSet from 'power-set-x'

export opaque type Unit : string = string
export opaque type AmountValue : number = number

export type Amount = {
  +value: AmountValue,
  +unit: ?Unit,
  // See https://github.com/facebook/flow/issues/4946#issuecomment-331451281 and https://github.com/facebook/flow/issues/2405
  [any]: empty
}

mathjs.createUnit("tbsp", {
  definition: "1 tablespoon",
  aliases: ["EL"]
})

mathjs.createUnit("tsp", {
  definition: "1 teaspoon",
  aliases: ["TL"]
})

export function createUnit(unitSpec: string): Unit {
  const unit = unitSpec.trim()
  // check if mathjs considers it a valid unit (will throw if not)
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
  if (valueSpec <= 0) {
    throw new TypeError('AmountValue can only be positive')
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
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅐": "1/7",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
  "⅑": "1/9",
  "⅒": "1/10",
}

const amountStringTransformations = [
  // retry with comma as decimal seperator and semicolon as argument seperator
  amountString => amountString.replace(/,|;/g, match => match == ',' ? '.': ','),

  // retry with replaced unicode vulgar fractions
  amountString => mapReplace(amountString, unicodeVulgarFractions)
]
const amountStringTransformationCombinations = powerSet(amountStringTransformations)

export function createAmountFromString(amountString: string): Amount {
  // We store the error that occured during the first try and throw that in the end as it would 
  // be confusing to receive the error for a transformed version.
  let initialError: ?Error = null

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

export function mergeAmounts(base: ?Amount, client: ?Amount, server: ?Amount): ?Amount {
  if (_.isEqual(base, client)) {
    return server
  }
  if (_.isEqual(base, server)) {
    return client
  }

  return mergeAmountsTwoWay(client, server)
}

export function mergeAmountsTwoWay(client: ?Amount, server: ?Amount): ?Amount {
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

export function addAmounts(a1: ?Amount, a2: ?Amount) {
  const mv1 = amountToMathjsValue(a1)
  const mv2 = amountToMathjsValue(a2)
  const mres = mathjs.add(mv1, mv2)
  const normalizedResult = mres instanceof mathjs.type.Unit ? mathjsUnitToCookingMathjsUnit(mres) : mres
  return mathjsValueToAmount(normalizedResult)
}

type MathjsValue = mathjs.type.Unit | mathjs.type.BigNumber | mathjs.type.Fraction | number

function toNumber(mathjsValue: MathjsValue): number {
  if (mathjsValue instanceof mathjs.type.Unit
    || mathjsValue instanceof mathjs.type.BigNumber
    || mathjsValue instanceof mathjs.type.Fraction
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
    unit: mathjsValue instanceof mathjs.type.Unit ? mathjsValue.toJSON().unit : undefined
  })
}

function amountToMathjsValue(amount: ?Amount): MathjsValue {
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
  if (mathjsUnit.equalBase(mathjs.unit("l"))) {
    cooking = mathjs.unit(mathjsUnit.to("l").toString())
  } else if (mathjsUnit.equalBase(mathjs.unit("kg"))){
      cooking = mathjs.unit(mathjsUnit.to("kg").toString())
  } else {
    cooking = mathjsUnit
  }
  // make mathjs choose a suitable prefix automagically
  const prefixed = mathjs.unit(cooking.toString())
  return prefixed
}

export function mapReplace(str: string, replacements: {[string]: string}) {
  const regexpStr = Object.keys(replacements).map(r => escapeStringRegexp(r)).join('|')

  return str.replace(RegExp(regexpStr, 'g'), match => replacements[match])
}

export function replaceFirstOccurences(
  str: string, 
  searchValue: RegExp, 
  replaceValue: string | (substring: string, ...args: Array<any>) => string, 
  maxReplacements: number
): string {
  const globalSearchValue = searchValue.flags.indexOf('g') === -1 
    ? RegExp(searchValue, searchValue.flags + 'g') 
    : searchValue
  const replaceValueIsFunction = typeof replaceValue === 'function'

  let n = 0
  return str.replace(globalSearchValue, match => {
    if (n < maxReplacements) {
      n++
      if (replaceValueIsFunction) {
        // $FlowFixMe
        return replaceValue(match)
      } else {
        // $FlowFixMe
        return replaceValue
      }
    } else {
      return match
    }
  })
}