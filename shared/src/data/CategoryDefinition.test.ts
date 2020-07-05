/* eslint-env jest */
import { createRandomUUID, createUUID } from '../util/uuid'
import { createCategoryDefinition, getCategoryMapping, mergeCategoryLists } from './CategoryDefinition'

const id = createUUID('a58df112-085f-4742-873d-8f8e31af7826')

describe(`createCategoryDefinition`, () => {
  it(`Creates Category`, () => {
    createCategoryDefinition({
      id: id,
      name: 'Milchprodukte',
      shortName: 'M',
      color: 'yellow',
      lightText: false,
    })
  })

  it(`Doesn't create category for unknown color`, () => {
    expect(() => {
      createCategoryDefinition({
        id: id,
        name: 'Milchprodukte',
        shortName: 'M',
        color: 'blau',
        lightText: false,
      })
    }).toThrow('The given color "blau" is not a valid color value')
  })
})

describe('getCategoryMapping', () => {
  function makeCategory(name: string) {
    return {
      name,
      id: createRandomUUID(),
      shortName: name[0].toUpperCase(),
      color: 'black',
      lightText: false,
    }
  }

  it('Pairs categories with matching names', () => {
    const left = [makeCategory('Trees'), makeCategory('Cheese')]
    const right = [makeCategory('Fun'), makeCategory('trees '), makeCategory('stuff'), makeCategory('TREES')]

    const { leftToRight, rightToLeft } = getCategoryMapping(left, right)

    expect(Object.keys(leftToRight)).toEqual(expect.arrayContaining(left.map((c) => c.id)))
    expect(Object.keys(rightToLeft)).toEqual(expect.arrayContaining(right.map((c) => c.id)))

    expect(leftToRight[left[0].id]).toEqual(expect.arrayContaining([right[1].id, right[3].id]))
    expect(leftToRight[left[1].id]).toEqual([])
  })
})

describe('mergeCategoryLists', () => {
  const base = [
    createCategoryDefinition({
      id: '9b98222d-55bc-46c8-934a-eef059ff5b20',
      name: 'Milchprodukte',
      shortName: 'M',
      color: 'yellow',
      lightText: false,
    }),
    createCategoryDefinition({
      id: '8c836769-0083-486b-bfaa-249b0e9363d3',
      name: 'Gewürze',
      shortName: 'GW',
      color: '#D7CCC8',
      lightText: false,
    }),
  ]

  const patch = [
    createCategoryDefinition({
      id: '3232d55e-ad9c-4e8c-b6e5-d5c4ee967d01',
      name: 'Milchprodukte',
      shortName: 'MI',
      color: 'goldenrod',
      lightText: false,
    }),
    createCategoryDefinition({
      id: '83a33324-43ec-42b0-b92f-4a18628502a7',
      name: 'Kaffee und Tee',
      shortName: 'KT',
      color: '#4E342E',
      lightText: true,
    }),
  ]

  it('Merges category lists, ignoring matching entries already present', () => {
    const merged = mergeCategoryLists(base, patch, { preferBase: true, dropUnmatched: false })

    expect(merged).toHaveLength(3)
    expect(merged).toEqual(expect.arrayContaining([...base, patch[1]]))
  })

  it('Merges category lists, dropping unmatched', () => {
    const merged = mergeCategoryLists(base, patch, { preferBase: true, dropUnmatched: true })

    expect(merged).toHaveLength(2)
    expect(merged).toEqual(expect.arrayContaining([base[0], patch[1]]))
  })

  it('Merges category lists, preferring patch', () => {
    const merged = mergeCategoryLists(base, patch, { preferBase: false, dropUnmatched: false })

    expect(merged).toHaveLength(3)
    expect(merged).toEqual(expect.arrayContaining([{ ...patch[0], id: base[0].id }, base[1], patch[1]]))
  })

  it('Merges category lists, preferring patch and dropping unmatched', () => {
    const merged = mergeCategoryLists(base, patch, { preferBase: false, dropUnmatched: true })

    expect(merged).toHaveLength(2)
    expect(merged).toEqual(expect.arrayContaining([{ ...patch[0], id: base[0].id }, patch[1]]))
  })
})
