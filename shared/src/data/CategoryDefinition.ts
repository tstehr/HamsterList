import colorString from 'color-string'
import deepFreeze from 'deep-freeze'
import _ from 'lodash'
import { createUUID, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, endValidation } from '../util/validation'

export type Color = string
export interface CategoryDefinition {
  readonly id: UUID
  readonly name: string
  readonly shortName: string
  readonly color: Color
  readonly lightText: boolean
}

export function createColor(colorSpec: string): Color {
  const color = colorString.get(colorSpec)

  if (!color) {
    throw new Error(`The given color "${colorSpec}" is not a valid color value`)
  }

  return colorSpec
}

export function createCategoryDefinition(categoryDefinitionSpec: unknown): CategoryDefinition {
  if (
    checkKeys(categoryDefinitionSpec, ['id', 'name', 'shortName', 'color', 'lightText']) &&
    checkAttributeType(categoryDefinitionSpec, 'id', 'string') &&
    checkAttributeType(categoryDefinitionSpec, 'name', 'string') &&
    checkAttributeType(categoryDefinitionSpec, 'shortName', 'string') &&
    checkAttributeType(categoryDefinitionSpec, 'color', 'string') &&
    checkAttributeType(categoryDefinitionSpec, 'lightText', 'boolean')
  ) {
    const categoryDefinition = {
      id: createUUID(categoryDefinitionSpec.id),
      name: categoryDefinitionSpec.name.trim(),
      shortName: categoryDefinitionSpec.shortName.trim(),
      color: createColor(categoryDefinitionSpec.color),
      lightText: !!categoryDefinitionSpec.lightText,
    }

    return deepFreeze(categoryDefinition)
  }
  endValidation()
}

interface UnsafeDict<V> {
  [k: string]: V | undefined
}

export interface CategoryMapping {
  [k: string]: readonly UUID[]
}

export function getCategoryMapping(left: readonly CategoryDefinition[], right: readonly CategoryDefinition[]) {
  const leftByName = _.groupBy(left, (c) => normalizeCategoryDefinitionName(c.name)) as UnsafeDict<CategoryDefinition[]>
  const rightByName = _.groupBy(right, (c) => normalizeCategoryDefinitionName(c.name)) as UnsafeDict<CategoryDefinition[]>
  const names = [...Object.keys(leftByName), ...Object.keys(rightByName)]

  const leftToRight: CategoryMapping = {}
  const rightToLeft: CategoryMapping = {}

  for (const name of names) {
    const lids = leftByName[name]?.map((c) => c.id) ?? []
    const rids = rightByName[name]?.map((c) => c.id) ?? []

    for (const lid of lids) {
      leftToRight[lid] = rids
    }
    for (const rid of rids) {
      rightToLeft[rid] = lids
    }
  }

  return {
    leftToRight,
    rightToLeft,
  }
}

export function mergeCategoryLists(
  base: readonly CategoryDefinition[],
  patch: readonly CategoryDefinition[],
  { preferBase, dropUnmatched }: { preferBase: boolean; dropUnmatched: boolean }
): readonly CategoryDefinition[] {
  const { leftToRight: baseToPatch, rightToLeft: patchToBase } = getCategoryMapping(base, patch)

  const newBase = base
    .map((b) => {
      const pid = _.head(baseToPatch[b.id])
      const p = pid ? patch.find((c) => c.id === pid) : undefined
      if (p) {
        return preferBase
          ? b
          : {
              ...p,
              id: b.id,
            }
      }
      return dropUnmatched ? null : b
    })
    .filter((b: CategoryDefinition | null): b is CategoryDefinition => b !== null)

  const unmatchedPatch = patch.filter((c) => patchToBase[c.id].length === 0)

  return [...newBase, ...unmatchedPatch]
}

export function normalizeCategoryDefinitionName(name: string) {
  return name.trim().toLowerCase()
}
