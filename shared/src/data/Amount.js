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

export function createUnit(unitSpec: string): Unit {
  const unit = unitSpec.trim()
  // check if mathjs considers it a valid unit (will throw if not)
  mathjs.unit(unit)
  return unit
}

export function createAmountValue(valueSpec: number): AmountValue {
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
  const evalResult: MathjsValue = mathjs.eval(amountString)
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

  let mathjsClient = client != null ? amountToMathjsValue(client) : 1
  let mathjsServer = server != null ? amountToMathjsValue(server) : 1
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

function mathjsValueToAmount(mathjsValue: MathjsValue): Amount{
  return createAmount({
    value: toNumber(mathjsValue),
    unit: mathjsValue instanceof mathjs.type.Unit ? mathjsValue.toJSON().unit : undefined
  })
}

function amountToMathjsValue(amount: Amount): MathjsValue {
  if (amount.unit != null) {
    return mathjs.unit(amount.value, amount.unit)
  } else {
    return amount.value
  }
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
