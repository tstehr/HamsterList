// @flow

import { type Item, type LocalItem, createItem, createLocalItem, createLocalItemFromString, mergeItems } from './Item'
import { type CategoryDefinition, createCategoryDefinition } from './CategoryDefinition'
import { type UUID, createUUID } from '../util/uuid'

const id = createUUID("a58df112-085f-4742-873d-8f8e31af7826")

const categories = [
	createCategoryDefinition({
		"id": "6ca0f054-209c-46c9-b337-6088f7a530ab",
		"name": "Obst und Gemüse",
		"shortName": "OG",
		"color": "green",
		"lightText": false
	}),
	createCategoryDefinition({
		"id": "7ca893d0-bc4f-4a79-bdc1-3853cec70001",
		"name": "Milchprodukte",
		"shortName": "M",
		"color": "yellow",
		"lightText": false
	})
]

describe('createItem', () => {
	it('Creates an item', () => {
		createItem({
			id: id,
			name: 'Lachs',
			amount: {
				value: 500,
				unit: 'g'
			}
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
				unit: undefined
			},
			category: undefined,
		})
	})

	it('Creates an object with amount and unit', () => {
		expect(createLocalItemFromString('1kg Käse', categories)).toEqual({
			name: 'Käse',
			amount: {
				value: 1,
				unit: 'kg'
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
				unit: 'm^2'
			},
			category: undefined,
		})
	})

	it('Creates an object with a calculation', () => {
		expect(createLocalItemFromString('(5 m)^2 Pizzateig', categories)).toEqual({
			name: 'Pizzateig',
			amount: {
				value: 25,
				unit: 'm^2'
			},
			category: undefined,
		})
	})

	it('Doesn\'t create an object with unit and no amount', () => {
		expect(createLocalItemFromString('kg Käse', categories)).toEqual({
			name: 'kg Käse',
			amount: undefined,
			category: undefined,
		})
	})

	it('Doesn\'t create an object with negative amount', () => {
		expect(createLocalItemFromString('-1 kg Käse', categories)).toEqual({
			name: '-1 kg Käse',
			amount: undefined,
			category: undefined,
		})
	})

	it('Creates an object with a category', () => {
		expect(createLocalItemFromString('(M) Milch', categories)).toEqual({
			name: 'Milch',
			amount: undefined,
			category: "7ca893d0-bc4f-4a79-bdc1-3853cec70001"
		})
	})

	it('Creates an object with no category set explicitly', () => {
		expect(createLocalItemFromString('(?) Nix', categories)).toEqual({
			name: 'Nix',
			amount: undefined,
			category: null
		})
	})
})


describe('mergeItems', () => {
  it('Prefers changed name server', () => {
      const base = {...createLocalItemFromString('500g Käse', []), id: id}
      const client = {...createLocalItemFromString('700g Käse', []), id: id}
      const server = {...createLocalItemFromString('500g Bergkäse', []), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString('700g Bergkäse', []), id: id})
  })
  it('Prefers changed name client', () => {
      const base = {...createLocalItemFromString('500g Käse', []), id: id}
      const client = {...createLocalItemFromString('600g Käse (Emmentaler)', []), id: id}
      const server = {...createLocalItemFromString('700g Käse', []), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString('700g Käse (Emmentaler)', []), id: id})
  })
  it('Prefers longer name when both changed (client longer)', () => {
      const base = {...createLocalItemFromString('500g Käse', []), id: id}
      const client = {...createLocalItemFromString('600g Käse (Emmentaler)', []), id: id}
      const server = {...createLocalItemFromString('700g Bergkäse', []), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString('700g Käse (Emmentaler)', []), id: id})
  })
  it('Prefers longer name when both changed (server longer)', () => {
      const base = {...createLocalItemFromString('500g Käse', []), id: id}
      const client = {...createLocalItemFromString('600g Käse (Emmentaler)', []), id: id}
      const server = {...createLocalItemFromString('700g Bergkäse (Gruyere)', []), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString('700g Bergkäse (Gruyere)', []), id: id})
  })
})
