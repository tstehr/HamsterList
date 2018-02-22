// @flow
import jest from 'jest'
import {
  type Amount, type AmountValue, type Unit,
  createAmount, createAmountFromString, createCookingAmount, createAmountValue, createUnit, mergeAmounts, getSIUnit, addAmounts
} from './Amount'

describe(`createAmountValue`, () => {
  it(`Creates AmountValue from posisive number`, () => {
    const val : AmountValue = createAmountValue(5)
  })

  it(`Doesn't create AmountValue from negative number`, () => {
    expect(() => {
      const val : AmountValue = createAmountValue(-5)
    }).toThrow('AmountValue can only be positive')
  })
})


describe(`createUnit`, () => {
  it(`Creates Unit from string "kg"`, () => {
    const unit : Unit = createUnit('kg')
  })

  it(`Doesn't create Unit from random string`, () => {
    expect(() => {
      const unit : Unit = createUnit('asdasd')
    }).toThrow('Unit "asdasd" not found')
  })
})


describe("createAmount", () => {
  it("Creates Amount from object", () => {
    const amount : Amount = createAmount({
      value: 5,
      unit: null,
    })
  })

  it("Creates Amount from object with unit", () => {
    const amount : Amount = createAmount({
      value: 5,
      unit: 'kg',
    })
  })

  it("Doesn't create Amount from a non-object", () => {
    expect(() => {
      const amount : Amount = createAmount(5)
    }).toThrow('Given value must be an object')
  })

  it("Doesn't create Amount with unexpected keys", () => {
    expect(() => {
      const amount : Amount = createAmount({
        value: 5,
        unit: 'kg',
        x: 'y',
        y:'z'
      })
    }).toThrow('Given object contained unexpected keys: x,y')
  })

  it("Doesn't create Amount with no value", () => {
    expect(() => {
      const amount : Amount = createAmount({
        unit: 'kg',
      })
    }).toThrow('Given object must have an attribute "value"')
  })

  it("Doesn't create Amount with wrong value type", () => {
    expect(() => {
      const amount : Amount = createAmount({
        value: false,
        unit: 'kg',
      })
    }).toThrow('Expected attribute "value" to be of type "number" but is of type "boolean" instead')
  })

  it("Doesn't create Amount with wrong unit type", () => {
    expect(() => {
      const amount : Amount = createAmount({
        value: 1,
        unit: 42,
      })
    }).toThrow('Expected attribute "unit" to be of type "string" but is of type "number" instead')
  })
})

describe('createAmountFromString', () => {
  it("Creates Amount", () => {
    const amount = createAmountFromString('5+5')
  })

  it("Creates Amount with unit", () => {
    const amount = createAmountFromString('(17 - 3) m/s^2')
  })
})

describe('createCookingAmount', () => {
  it('Convert imperial volume Amount to metric', () => {
    const amount = createAmountFromString('5 floz')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 0.14786765,
      unit: 'l'
    })
  })

  it('Converts imperial mass Amount to metric', () => {
    const amount = createAmountFromString('10 oz')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 0.28349523125000003,
      unit: 'kg'
    })
  })

  it('Passes amount without unit on unchanged', () => {
    const amount = createAmountFromString('10')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 10,
      unit: null,
    })
  })

  it('Passes amount without strange unit on unchanged', () => {
    const amount = createAmountFromString('10 kg / m^2')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 10,
      unit: 'kg / m^2'
    })
  })
})

describe('mergeAmounts', () => {
  it('Prefers changed client', () => {
      const base = createAmountFromString("10 kg")
      const client = createAmountFromString("10 kg")
      const server = createAmountFromString("14 kg")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(server)
  })

  it('Prefers changed server', () => {
      const base = createAmountFromString("10 kg")
      const client = undefined
      const server = createAmountFromString("10 kg")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })

  it('Respects both delete', () => {
      const base = createAmountFromString("10 kg")
      const client = undefined
      const server = undefined
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })

  it('Perfers larger', () => {
      const base = createAmountFromString("10")
      const client = createAmountFromString("15")
      const server = createAmountFromString("20")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(server)
  })

  it('Perfers larger with client undefined', () => {
      const base = createAmountFromString(".5")
      const client = undefined
      const server = createAmountFromString(".6")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })

  it('Perfers larger with server undefined', () => {
      const base = createAmountFromString("8")
      const client = createAmountFromString("7")
      const server = undefined
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })

  it('Perfers larger', () => {
      const base = createAmountFromString("10 kg")
      const client = createAmountFromString("15000 g")
      const server = createAmountFromString("14 kg")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })

  it('Defaults to client', () => {
      const base = createAmountFromString("10 kg")
      const client = createAmountFromString("15000 l")
      const server = createAmountFromString("14 kg")
      const merged = mergeAmounts(base, client, server)
      expect(merged).toEqual(client)
  })
})

describe('getSIUnit', () => {
  it('Gets a SI uni from imperial', () => {
    const amount = createAmountFromString('5 floz')
    const derived = createCookingAmount(amount)
    expect(getSIUnit(amount)).toEqual('m^3')
  })

  it('Gets a SI unit from liters', () => {
    const amount = createAmountFromString('20 ml')
    const derived = createCookingAmount(amount)
    expect(getSIUnit(amount)).toEqual('m^3')
  })

  it('Returns null for amounts without unit', () => {
    const amount = createAmountFromString('20')
    const derived = createCookingAmount(amount)
    expect(getSIUnit(amount)).toEqual(null)
  })
})

describe('addAmounts', () => {
  it('Adds two volumes', () => {
    const a1 = createAmountFromString("5 l")
    const a2 = createAmountFromString("500 ml")
    expect(addAmounts(a1, a2)).toEqual({
      value: 5.5,
      unit: 'l'
    })
  })

  it('Adds two volumes with different units', () => {
    const a1 = createAmountFromString("50 ml")
    const a2 = createAmountFromString("3 EL")
    const result = addAmounts(a1, a2)
    expect(result.unit).toEqual("ml")
    expect(result.value).toBeCloseTo(95)
  })

  it('Doesn\'t add two volumes with incompatible units', () => {
    const a1 = createAmountFromString("50 ml")
    const a2 = createAmountFromString("30 g")

    expect(() => {
      addAmounts(a1, a2)
    }).toThrow('Units do not match')
  })
})
