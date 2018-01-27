// @flow
import React from 'react'
import toMaterialStyle from 'material-color-hash'
import './CategoryComponent.css'

type Props = {
  categoryName: ?string
}

export default function CategoryComponent(props: Props) {
  const initials = props.categoryName != null ? createInitials(props.categoryName) : '?'

  return <div class="CategoryComponent"><div class="CategoryComponent__circle"><span>{initials}</span></div></div>
}

function createInitials(categoryName: string) {
  return String.fromCodePoint(categoryName.codePointAt(0)).toUpperCase()
}
