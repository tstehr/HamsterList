import deepFreeze from 'deep-freeze'
import fs from 'fs-extra'
import { createServerShoppingList, ServerShoppingList } from './ServerShoppingList'

export interface DBContents {
  readonly lists: readonly ServerShoppingList[]
}

export class DB {
  path: string
  contents: DBContents | undefined | null

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
      json = {
        lists: [],
      }
    }

    this.contents = deepFreeze({
      lists: json.lists.map(createServerShoppingList),
    })
    return this.contents
  }

  write(): Promise<void> {
    return fs.outputJSON(this.path, this.contents, {
      spaces: 2,
    })
  }

  get(): DBContents {
    if (this.contents == null) {
      throw new Error('Read before load!')
    }
    return this.contents
  }

  set(newContents: DBContents): void {
    this.contents = deepFreeze(newContents)
  }
}
