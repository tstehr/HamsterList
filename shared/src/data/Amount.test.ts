/* eslint-env jest */
import {
  createAmount,
  createAmountFromString,
  createCookingAmount,
  createAmountValue,
  createUnit,
  mergeAmounts,
  getSIUnit,
  addAmounts,
  mapReplace,
  powerSet,
} from './Amount'
describe(`createAmountValue`, () => {
  it(`Creates AmountValue from positive number`, () => {
    createAmountValue(5)
  })
  it(`Creates AmountValue from negative number`, () => {
    createAmountValue(-5)
  })
})
describe(`createUnit`, () => {
  it(`Creates Unit from string "kg"`, () => {
    createUnit('kg')
  })
  it(`Doesn't create Unit from random string`, () => {
    expect(() => {
      createUnit('asdasd')
    }).toThrow('Unit "asdasd" not found')
  })
})
describe('createAmount', () => {
  it('Creates Amount from object', () => {
    createAmount({
      value: 5,
      unit: null,
    })
  })
  it('Creates Amount from object with unit', () => {
    createAmount({
      value: 5,
      unit: 'kg',
    })
  })
  it("Doesn't create Amount from a non-object", () => {
    expect(() => {
      createAmount(5)
    }).toThrow('Given value must be an object')
  })
  it("Doesn't create Amount with unexpected keys", () => {
    expect(() => {
      createAmount({
        value: 5,
        unit: 'kg',
        x: 'y',
        y: 'z',
      })
    }).toThrow('Given object contained unexpected keys: x,y')
  })
  it("Doesn't create Amount with no value", () => {
    expect(() => {
      createAmount({
        unit: 'kg',
      })
    }).toThrow('Given object must have an attribute "value"')
  })
  it("Doesn't create Amount with wrong value type", () => {
    expect(() => {
      createAmount({
        value: false,
        unit: 'kg',
      })
    }).toThrow('Expected attribute "value" to be of type "number" but is of type "boolean" instead')
  })
  it("Doesn't create Amount with wrong unit type", () => {
    expect(() => {
      createAmount({
        value: 1,
        unit: 42,
      })
    }).toThrow('Expected attribute "unit" to be of type "string" but is of type "number" instead')
  })
})
describe('createAmountFromString', () => {
  it('Creates Amount', () => {
    const amount = createAmountFromString('5+5')
    expect(amount).toEqual({
      value: 10,
      unit: undefined,
    })
  })
  it('Creates Amount with unit', () => {
    const amount = createAmountFromString('(17 - 3) m/s^2')
    expect(amount).toEqual({
      value: 14,
      unit: 'm / s^2',
    })
  })
  it('Creates Amount with function call using comma as argument sepeator', () => {
    const amount = createAmountFromString('add(5,5)')
    expect(amount).toEqual({
      value: 10,
      unit: undefined,
    })
  })
  it('Creates Amount with function call using semicolon as argument sepeator', () => {
    const amount = createAmountFromString('add(1;2)')
    expect(amount).toEqual({
      value: 3,
      unit: undefined,
    })
  })
  it('Creates Amount with dot as decimal seperator', () => {
    const amount = createAmountFromString('5.5')
    expect(amount).toEqual({
      value: 5.5,
      unit: undefined,
    })
  })
  it('Creates Amount with comma as decimal seperator', () => {
    const amount = createAmountFromString('5,5')
    expect(amount).toEqual({
      value: 5.5,
      unit: undefined,
    })
  })
  it('Creates Amount with unicode vulgar fraction', () => {
    const amount = createAmountFromString('¾')
    expect(amount).toEqual({
      value: 0.75,
      unit: undefined,
    })
  })
  it('Creates Amount from calculation with fraction', () => {
    const amount = createAmountFromString('¾ * ⅖')
    expect(amount).toEqual({
      value: 0.3,
      unit: undefined,
    })
  })
  it('Creates Amount from calculation with fraction and value with dot as decimal seperator', () => {
    const amount = createAmountFromString('½ * 0.5')
    expect(amount).toEqual({
      value: 0.25,
      unit: undefined,
    })
  })
  it('Creates Amount from calculation with fraction and value with comma as decimal seperator', () => {
    const amount = createAmountFromString('½ * 0,5')
    expect(amount).toEqual({
      value: 0.25,
      unit: undefined,
    })
  })
  it('Creates Amount from mixed fraction', () => {
    const amount = createAmountFromString('1 1/2')
    expect(amount).toEqual({
      value: 1.5,
      unit: undefined,
    })
  })
  it('Creates Amount from mixed fraction with unicode vulgar fraction', () => {
    const amount = createAmountFromString('1 ¾')
    expect(amount).toEqual({
      value: 1.75,
      unit: undefined,
    })
  })
  it('Creates Amount from calculation with mixed fraction', () => {
    const amount = createAmountFromString('-1 * -1 1/4')
    expect(amount).toEqual({
      value: 1.25,
      unit: undefined,
    })
  })
  it('Creates Amount from calculation with mixed fraction, units and function calls', () => {
    const amount = createAmountFromString('1 ¼ m * pow(6 N, 2)')
    expect(amount).toEqual({
      value: 45,
      unit: 'm N^2',
    })
  })
  it('Handles "1/0" correctly', () => {
    expect(() => {
      createAmountFromString('1/0')
    }).toThrow('AmountValue must be finite')
  })
  it("Doesn't create amount for invalid syntax", () => {
    expect(() => {
      createAmountFromString('(5 ')
    }).toThrow()
  })
  it("Doesn't create amount for mix of comma as decimal and argument seperator", () => {
    expect(() => {
      createAmountFromString('5,5 + add(5,5)')
    }).toThrow()
  })
})
describe('createCookingAmount', () => {
  it('Convert imperial volume Amount to metric', () => {
    const amount = createAmountFromString('5 floz')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 0.14786765,
      unit: 'l',
    })
  })
  it('Converts imperial mass Amount to metric', () => {
    const amount = createAmountFromString('10 oz')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 0.28349523125000003,
      unit: 'kg',
    })
  })
  it('Passes amount without unit on unchanged', () => {
    const amount = createAmountFromString('10')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 10,
      unit: undefined,
    })
  })
  it('Passes amount without strange unit on unchanged', () => {
    const amount = createAmountFromString('10 kg / m^2')
    const derived = createCookingAmount(amount)
    expect(derived).toEqual({
      value: 10,
      unit: 'kg / m^2',
    })
  })
})
describe('mergeAmounts', () => {
  it('Prefers changed client', () => {
    const base = createAmountFromString('10 kg')
    const client = createAmountFromString('10 kg')
    const server = createAmountFromString('14 kg')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(server)
  })
  it('Prefers changed server', () => {
    const base = createAmountFromString('10 kg')
    const client = undefined
    const server = createAmountFromString('10 kg')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
  it('Respects both delete', () => {
    const base = createAmountFromString('10 kg')
    const client = undefined
    const server = undefined
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
  it('Perfers larger', () => {
    const base = createAmountFromString('10')
    const client = createAmountFromString('15')
    const server = createAmountFromString('20')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(server)
  })
  it('Perfers larger with client undefined', () => {
    const base = createAmountFromString('.5')
    const client = undefined
    const server = createAmountFromString('.6')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
  it('Perfers larger with server undefined', () => {
    const base = createAmountFromString('8')
    const client = createAmountFromString('7')
    const server = undefined
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
  it('Perfers larger', () => {
    const base = createAmountFromString('10 kg')
    const client = createAmountFromString('15000 g')
    const server = createAmountFromString('14 kg')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
  it('Defaults to client', () => {
    const base = createAmountFromString('10 kg')
    const client = createAmountFromString('15000 l')
    const server = createAmountFromString('14 kg')
    const merged = mergeAmounts(base, client, server)
    expect(merged).toEqual(client)
  })
})
describe('getSIUnit', () => {
  it('Gets a SI uni from imperial', () => {
    const amount = createAmountFromString('5 floz')
    expect(getSIUnit(amount)).toEqual('m^3')
  })
  it('Gets a SI unit from liters', () => {
    const amount = createAmountFromString('20 ml')
    expect(getSIUnit(amount)).toEqual('m^3')
  })
  it('Returns null for amounts without unit', () => {
    const amount = createAmountFromString('20')
    expect(getSIUnit(amount)).toEqual(null)
  })
})
describe('addAmounts', () => {
  it('Adds two volumes', () => {
    const a1 = createAmountFromString('5 l')
    const a2 = createAmountFromString('500 ml')
    expect(addAmounts(a1, a2)).toEqual({
      value: 5.5,
      unit: 'l',
    })
  })
  it('Adds two volumes with different units', () => {
    const a1 = createAmountFromString('50 ml')
    const a2 = createAmountFromString('3 EL')
    const result = addAmounts(a1, a2)
    expect(result.unit).toEqual('ml')
    expect(result.value).toBeCloseTo(95)
  })
  it("Doesn't add two volumes with incompatible units", () => {
    const a1 = createAmountFromString('50 ml')
    const a2 = createAmountFromString('30 g')
    expect(() => {
      addAmounts(a1, a2)
    }).toThrow('Units do not match')
  })
})
describe('mapReplace', () => {
  it('Replaces mapped chars', () => {
    expect(
      mapReplace('a b c b', {
        a: 'x',
        b: 'y',
      })
    ).toEqual('x y c y')
  })
  it('Replaces mapped strings', () => {
    expect(
      mapReplace(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        {
          Lorem: 'Dolorem',
          elit: 'velit',
          adipisci: 'adipiscing',
          incididunt: 'incidunt',
          magna: 'magnam',
          aliqua: 'aliquam',
        }
      )
    ).toEqual(
      'Dolorem ipsum dolor sit amet, consectetur adipiscingng velit, sed do eiusmod tempor incidunt ut labore et dolore magnam aliquam.'
    )
  })
  it('Replaces with regexp special chars', () => {
    expect(
      mapReplace('| \\ [+] (5)', {
        '+': '-',
        '|': '&',
        '(5)': '^5$',
      })
    ).toEqual('& \\ [-] ^5$')
  })
})
describe('powerSet', () => {
  it('Computes a power set', () => {
    const result = powerSet([1, 2, 3])
    expect(result).toHaveLength(8)
    expect(result).toContainEqual([])
    expect(result).toContainEqual([1])
    expect(result).toContainEqual([2])
    expect(result).toContainEqual([3])
    expect(result).toContainEqual([1, 3])
    expect(result).toContainEqual([1, 2])
    expect(result).toContainEqual([1, 2, 3])
  })
})
