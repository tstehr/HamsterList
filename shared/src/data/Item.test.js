// @flow

import { type Item, type LocalItem, createItem, createLocalItem, createLocalItemFromString, mergeItems } from './Item'
import { type UUID, createUUID } from '../util/uuid'

const id = createUUID("a58df112-085f-4742-873d-8f8e31af7826")

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
		expect(createLocalItemFromString('Käse')).toEqual({
			name: 'Käse'
		})
	})

	it('Creates an object with amount', () => {
		expect(createLocalItemFromString('1 Käse')).toEqual({
			name: 'Käse',
			amount: {
				value: 1
			}
		})
	})

	it('Creates an object with amount and unit', () => {
		expect(createLocalItemFromString('1kg Käse')).toEqual({
			name: 'Käse',
			amount: {
				value: 1,
				unit: 'kg'
			}
		})
	})

	it('Creates an object with complex unit', () => {
		expect(createLocalItemFromString('5 l / s Mate')).toEqual({
			name: 'Mate',
			amount: {
				value: 5,
				unit: 'l / s',
			}
		})
	})

	it('Creates an object with squared units', () => {
		expect(createLocalItemFromString('5 m^2 Pizzateig')).toEqual({
			name: 'Pizzateig',
			amount: {
				value: 5,
				unit: 'm^2'
			}
		})
	})

	it('Creates an object with a calculation', () => {
		expect(createLocalItemFromString('(5 m)^2 Pizzateig')).toEqual({
			name: 'Pizzateig',
			amount: {
				value: 25,
				unit: 'm^2'
			}
		})
	})

	it('Doesn\'t create an object with unit and no amount', () => {
		expect(createLocalItemFromString('kg Käse')).toEqual({
			name: 'kg Käse',
		})
	})

	it('Doesn\'t create an object with negative amount', () => {
		expect(createLocalItemFromString('-1 kg Käse')).toEqual({
			name: '-1 kg Käse',
		})
	})
})


describe('mergeItems', () => {
  it('Prefers changed name server', () => {
      const base = {...createLocalItemFromString("500g Käse"), id: id}
      const client = {...createLocalItemFromString("700g Käse"), id: id}
      const server = {...createLocalItemFromString("500g Bergkäse"), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString("700g Bergkäse"), id: id})
  })
  it('Prefers changed name client', () => {
      const base = {...createLocalItemFromString("500g Käse"), id: id}
      const client = {...createLocalItemFromString("600g Käse (Emmentaler)"), id: id}
      const server = {...createLocalItemFromString("700g Käse"), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString("700g Käse (Emmentaler)"), id: id})
  })
  it('Prefers longer name when both changed (client longer)', () => {
      const base = {...createLocalItemFromString("500g Käse"), id: id}
      const client = {...createLocalItemFromString("600g Käse (Emmentaler)"), id: id}
      const server = {...createLocalItemFromString("700g Bergkäse"), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString("700g Käse (Emmentaler)"), id: id})
  })
  it('Prefers longer name when both changed (server longer)', () => {
      const base = {...createLocalItemFromString("500g Käse"), id: id}
      const client = {...createLocalItemFromString("600g Käse (Emmentaler)"), id: id}
      const server = {...createLocalItemFromString("700g Bergkäse (Gruyere)"), id: id}
			const merged = mergeItems(base, client, server)
			expect(merged).toEqual( {...createLocalItemFromString("700g Bergkäse (Gruyere)"), id: id})
  })
})
