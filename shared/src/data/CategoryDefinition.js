// @flow
import deepFreeze from 'deep-freeze'
import onecolor from 'onecolor'
import { type UUID, createUUID } from '../util/uuid'
import { checkKeys, checkAttributeType } from '../util/validation'

export opaque type Color : string = string

export type CategoryDefinition = {
  +id: UUID,
  +name: string,
  +shortName: string,
  +color: Color,
  +lightText: boolean
}

export function createColor(colorSpec: string): Color {
  if(!onecolor(colorSpec)) {
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
