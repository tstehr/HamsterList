import { describe, expect, it } from 'vitest'
import { createUUID } from '../util/uuid.js'
import { createAmountValue, createUnit } from './Amount.js'
import { createCategoryDefinition } from './CategoryDefinition.js'
import {
  addMatchingCategory,
  createCompletionItem,
  createItem,
  createItemFromItemStringRepresentation,
  createLocalItemFromItemStringRepresentation,
  createLocalItemFromString,
  Item,
  itemToString,
  mergeItems,
  mergeItemsTwoWay,
} from './Item.js'

const id = createUUID('a58df112-085f-4742-873d-8f8e31af7826')
const categories = [
  createCategoryDefinition({
    id: '6ca0f054-209c-46c9-b337-6088f7a530ab',
    name: 'Obst und Gemüse',
    shortName: 'OG',
    color: 'green',
    lightText: false,
  }),
  createCategoryDefinition({
    id: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
    name: 'Milchprodukte',
    shortName: 'M',
    color: 'yellow',
    lightText: false,
  }),
]

describe('createItem', () => {
  it('Creates an item', () => {
    createItem({
      id: id,
      name: 'Lachs',
      amount: {
        value: 500,
        unit: 'g',
      },
    })
  })
})

describe('createLocalItemFromString', () => {
  it('Creates a simple object', () => {
    expect(createLocalItemFromString('Käse', categories)).toEqual({
      name: 'Käse',
      amount: undefined,
      category: undefined,
    })
  })

  it('Creates an object with amount', () => {
    expect(createLocalItemFromString('1 Käse', categories)).toEqual({
      name: 'Käse',
      amount: {
        value: 1,
        unit: undefined,
      },
      category: undefined,
    })
  })

  it('Creates an object with amount and unit', () => {
    expect(createLocalItemFromString('1kg Käse', categories)).toEqual({
      name: 'Käse',
      amount: {
        value: 1,
        unit: 'kg',
      },
      category: undefined,
    })
  })

  it('Creates an object with complex unit', () => {
    expect(createLocalItemFromString('5 l / s Mate', categories)).toEqual({
      name: 'Mate',
      amount: {
        value: 5,
        unit: 'l / s',
      },
      category: undefined,
    })
  })

  it('Creates an object with squared units', () => {
    expect(createLocalItemFromString('5 m^2 Pizzateig', categories)).toEqual({
      name: 'Pizzateig',
      amount: {
        value: 5,
        unit: 'm^2',
      },
      category: undefined,
    })
  })

  it('Creates an object with a calculation', () => {
    expect(createLocalItemFromString('(5 m)^2 Pizzateig', categories)).toEqual({
      name: 'Pizzateig',
      amount: {
        value: 25,
        unit: 'm^2',
      },
      category: undefined,
    })
  })
  it("Doesn't create an object with unit and no amount", () => {
    expect(createLocalItemFromString('kg Käse', categories)).toEqual({
      name: 'kg Käse',
      amount: undefined,
      category: undefined,
    })
  })

  it('Creates an object with negative amount', () => {
    expect(createLocalItemFromString('-1 kg Käse', categories)).toEqual({
      name: 'Käse',
      amount: {
        value: -1,
        unit: 'kg',
      },
      category: undefined,
    })
  })

  it('Creates an object with a category', () => {
    expect(createLocalItemFromString('(M) Milch', categories)).toEqual({
      name: 'Milch',
      amount: undefined,
      category: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
    })
  })

  it('Creates an object with no category set explicitly', () => {
    expect(createLocalItemFromString('(?) Nix', categories)).toEqual({
      name: 'Nix',
      amount: undefined,
      category: null,
    })
  })
})

describe('createLocalItemFromStringRepresentation', () => {
  it('Creates a local item from string representation object', () => {
    expect(
      createLocalItemFromItemStringRepresentation(
        {
          stringRepresentation: '500g Käse',
        },
        categories,
      ),
    ).toEqual({
      name: 'Käse',
      amount: {
        value: 500,
        unit: 'g',
      },
      category: undefined,
    })
  })
})

describe('createlItemFromStringRepresentation', () => {
  it('Creates an item from string representation object', () => {
    expect(
      createItemFromItemStringRepresentation(
        {
          stringRepresentation: '(M) 500g Käse',
          id: id,
        },
        categories,
      ),
    ).toEqual({
      id: id,
      name: 'Käse',
      amount: {
        value: 500,
        unit: 'g',
      },
      category: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
    })
  })
})

describe('itemToString', () => {
  it('Creates a string from an item with only name', () => {
    expect(
      itemToString({
        id: id,
        name: 'Gemüse',
        amount: undefined,
        category: undefined,
      } as Item),
    ).toEqual('Gemüse')
  })

  it('Trims name if necessary', () => {
    expect(
      itemToString({
        id: id,
        name: 'Gemüse\t\n\n',
        amount: undefined,
        category: undefined,
      } as Item),
    ).toEqual('Gemüse')
  })

  it('Treats no name as empty string', () => {
    expect(
      itemToString({
        id: id,
        // @ts-expect-error Expected type error, to check runtime behavior
        name: undefined,
        amount: undefined,
        category: undefined,
      }),
    ).toEqual('')
  })

  it('Rounds amount value two to decimal places', () => {
    expect(
      itemToString({
        id: id,
        name: 'Gemüse',
        amount: {
          value: createAmountValue(1.1111),
          unit: undefined,
        },
        category: undefined,
      } as Item),
    ).toEqual('1.11 Gemüse')
  })

  it('Shows unit if supplied', () => {
    expect(
      itemToString({
        id: id,
        name: 'Gemüse',
        amount: {
          value: createAmountValue(1.1111),
          unit: createUnit('kg'),
        },
        category: undefined,
      } as Item),
    ).toEqual('1.11 kg Gemüse')
  })
})

describe('mergeItems', () => {
  it('Prefers changed name server', () => {
    const base = { ...createLocalItemFromString('500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('700g Käse', categories), id: id }
    const server = { ...createLocalItemFromString('500g Bergkäse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Bergkäse', categories), id: id })
  })

  it('Prefers changed name client', () => {
    const base = { ...createLocalItemFromString('500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('600g Käse (Emmentaler)', categories), id: id }
    const server = { ...createLocalItemFromString('700g Käse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Käse (Emmentaler)', categories), id: id })
  })

  it('Prefers longer name when both changed (client longer)', () => {
    const base = { ...createLocalItemFromString('500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('600g Käse (Emmentaler)', categories), id: id }
    const server = { ...createLocalItemFromString('700g Bergkäse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Käse (Emmentaler)', categories), id: id })
  })

  it('Prefers longer name when both changed (server longer)', () => {
    const base = { ...createLocalItemFromString('500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('600g Käse (Emmentaler)', categories), id: id }
    const server = { ...createLocalItemFromString('700g Bergkäse (Gruyere)', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Bergkäse (Gruyere)', categories), id: id })
  })

  it('Prefers changed category server', () => {
    const base = { ...createLocalItemFromString('(?) 500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('(?) 500g Käse', categories), id: id }
    const server = { ...createLocalItemFromString('(OG) 500g Käse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('(OG) 500g Käse', categories), id: id })
  })

  it('Prefers changed category client', () => {
    const base = { ...createLocalItemFromString('(OG) 500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('(M) 500g Käse', categories), id: id }
    const server = { ...createLocalItemFromString('(OG) 500g Käse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('(M) 500g Käse', categories), id: id })
  })

  it('Prefers changed category client when both changed', () => {
    const base = { ...createLocalItemFromString('(?) 500g Käse', categories), id: id }
    const client = { ...createLocalItemFromString('(M) 500g Käse', categories), id: id }
    const server = { ...createLocalItemFromString('(OG) 500g Käse', categories), id: id }
    const merged = mergeItems(base, client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('(M) 500g Käse', categories), id: id })
  })
})

describe('mergeItemTwoWays', () => {
  it('Prefers longer name (client longer)', () => {
    const client = { ...createLocalItemFromString('600g Käse (Emmentaler)', categories), id: id }
    const server = { ...createLocalItemFromString('700g Bergkäse', categories), id: id }
    const merged = mergeItemsTwoWay(client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Käse (Emmentaler)', categories), id: id })
  })

  it('Prefers longer name (server longer)', () => {
    const client = { ...createLocalItemFromString('600g Käse (Emmentaler)', categories), id: id }
    const server = { ...createLocalItemFromString('700g Bergkäse (Gruyere)', categories), id: id }
    const merged = mergeItemsTwoWay(client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('700g Bergkäse (Gruyere)', categories), id: id })
  })

  it('Prefers client name when equal length', () => {
    const client = { ...createLocalItemFromString('600g Käse', categories), id: id }
    const server = { ...createLocalItemFromString('600g Qäse', categories), id: id }
    const merged = mergeItemsTwoWay(client, server)
    expect(merged).toEqual({ ...createLocalItemFromString('600g Käse', categories), id: id })
  })
})

describe('addMatchingCategory', () => {
  const completions = [
    createCompletionItem({
      name: 'Eier',
      category: '7ca893d0-bc4f-4a79-bdc1-3853cec70001',
    }),
    createCompletionItem({
      name: 'eier',
      category: '6ca0f054-209c-46c9-b337-6088f7a530ab',
    }),
    createCompletionItem({
      name: 'Tomaten',
      category: '6ca0f054-209c-46c9-b337-6088f7a530ab',
    }),
    createCompletionItem({
      name: 'Tomaten (Konserve)',
      category: '1c7f575f-a34f-4a8e-9aa4-41fc40a85d52',
    }),
  ]
  it('Adds a matching category', () => {
    const item = createLocalItemFromString('2 Tomaten', categories)
    expect(addMatchingCategory(item, completions).category).toBe('6ca0f054-209c-46c9-b337-6088f7a530ab')
  })

  it(`Doesn't add a matching category if category is explicitly set to null`, () => {
    const item = createLocalItemFromString('(?) 2 Tomaten', categories)
    expect(addMatchingCategory(item, completions).category).toBe(null)
  })

  it(`Prefers completions with the correct case`, () => {
    const item1 = createLocalItemFromString('2 eier', categories)
    expect(addMatchingCategory(item1, completions).category).toBe('6ca0f054-209c-46c9-b337-6088f7a530ab')
    const item2 = createLocalItemFromString('2 Eier', categories)
    expect(addMatchingCategory(item2, completions).category).toBe('7ca893d0-bc4f-4a79-bdc1-3853cec70001')
  })

  it(`Uses case insensitive match if no correct case is found`, () => {
    const item = createLocalItemFromString('50 tomaten', categories)
    const result = addMatchingCategory(item, completions)
    expect(result.name).toBe('Tomaten')
    expect(result.category).toBe('6ca0f054-209c-46c9-b337-6088f7a530ab')
  })

  it(`Uses completions without parenthesized suffix if necessary`, () => {
    const item = createLocalItemFromString('50 tomaten (Groß)', categories)
    const result = addMatchingCategory(item, completions)
    expect(result.name).toBe('Tomaten (Groß)')
    expect(result.category).toBe('6ca0f054-209c-46c9-b337-6088f7a530ab')
  })

  it(`Prefers match with parenthesized suffix if available`, () => {
    const item = createLocalItemFromString('50 tomaten (konserve)', categories)
    const result = addMatchingCategory(item, completions)
    expect(result.name).toBe('Tomaten (Konserve)')
    expect(result.category).toBe('1c7f575f-a34f-4a8e-9aa4-41fc40a85d52')
  })

  it(`Leaves items with no match unchanged`, () => {
    const item = createLocalItemFromString('Stuff', categories)
    expect(addMatchingCategory(item, completions).category).toBe(undefined)
  })
})
