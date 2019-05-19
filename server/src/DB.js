// @flow
import fs from 'fs-extra'
import deepFreeze from 'deep-freeze'
import { type ServerShoppingList, createServerShoppingList } from './ServerShoppingList'

export type DBContents = {|
  +lists: $ReadOnlyArray<ServerShoppingList>
|}

export class DB {
  path: string
  contents: ?DBContents

  constructor(path: string) {
    this.path = path
  }

  async load(): Promise<DBContents> {
    if (this.contents != null) {
      return this.contents
    }

    let json
    try {
      json = await fs.readJson(this.path)
    } catch (e) {
      json = { lists: [] }
    }

    this.contents = deepFreeze({
      lists: json.lists.map(createServerShoppingList)
    })

    return this.contents
  }

  write(): Promise<void> {
    return fs.outputJSON(this.path, this.contents, { spaces: 2 })
  }

  get(): DBContents {
    if (this.contents == null) {
      throw new Error('Read before load!')
    }
    return this.contents
  }

  set(newContents: DBContents) {
    this.contents = deepFreeze(newContents)
  }
}


export function updateInArray<T, U: {+id: T}>(arr: $ReadOnlyArray<U>, toUpdate: U, insertIfNotFound: boolean=false): Array<U> {
  const index = arr.findIndex((arrEl) => arrEl.id == toUpdate.id)
  if (index === -1) {
    if (!insertIfNotFound) {
      throw new Error(`Element is not in array!`)
    }
    const newArr = [...arr, toUpdate]
    return deepFreeze(newArr)
  }
  const newArr = [...arr]
  newArr.splice(index, 1, toUpdate)
  return deepFreeze(newArr)
}
