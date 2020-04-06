import colorString from 'color-string'
import deepFreeze from 'deep-freeze'
import { createUUID, UUID } from '../util/uuid'
import { checkAttributeType, checkKeys, endValidation } from '../util/validation'

export type Color = string
export type CategoryDefinition = {
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
