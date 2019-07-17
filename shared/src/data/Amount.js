// @flow
import _ from 'lodash'
import mathjs from 'mathjs'
import deepFreeze from 'deep-freeze'
import { checkKeys, checkAttributeType, nullSafe } from '../util/validation'

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

export function createAmountFromString(amountString: string): Amount {
  let evalResult: MathjsValue = null
  try {
     evalResult = mathjs.eval(amountString)
  } catch (e) {
    // retry with comma as decimal seperator and semicolon as argument seperator
    const modAmountString = amountString.replace(/,|;/g, match => match == ',' ? '.': ',')
    try {
      evalResult = mathjs.eval(modAmountString)
    } catch (e2) {
      // Throw original for consistency
      throw e
    }
  }
  return mathjsValueToAmount(evalResult)
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
