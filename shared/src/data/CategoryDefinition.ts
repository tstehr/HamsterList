import deepFreeze from 'deep-freeze'
import colorString from 'color-string'
import { createUUID } from '../util/uuid'
import { UUID } from '../util/uuid'
import { checkKeys, checkAttributeType } from '../util/validation'
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
export function createCategoryDefinition(categoryDefinitionSpec: any): CategoryDefinition {
  checkKeys(categoryDefinitionSpec, ['id', 'name', 'shortName', 'color', 'lightText'])
  checkAttributeType(categoryDefinitionSpec, 'id', 'string')
  checkAttributeType(categoryDefinitionSpec, 'name', 'string')
  checkAttributeType(categoryDefinitionSpec, 'shortName', 'string')
  checkAttributeType(categoryDefinitionSpec, 'color', 'string')
  checkAttributeType(categoryDefinitionSpec, 'lightText', 'boolean')
  const categoryDefinition = {}
  categoryDefinition.id = createUUID(categoryDefinitionSpec.id)
  categoryDefinition.name = categoryDefinitionSpec.name.trim()
  categoryDefinition.shortName = categoryDefinitionSpec.shortName.trim()
  categoryDefinition.color = createColor(categoryDefinitionSpec.color)
  categoryDefinition.lightText = !!categoryDefinitionSpec.lightText
  return deepFreeze(categoryDefinition)
}
