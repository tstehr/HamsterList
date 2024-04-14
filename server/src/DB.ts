import Logger from 'bunyan'
import deepFreeze from 'deep-freeze'
import fs from 'fs-extra'
import writeJsonFile from 'write-json-file'
import { createServerShoppingList, ServerShoppingList } from './ServerShoppingList'

export interface DBContents {
  readonly lists: readonly ServerShoppingList[]
}

export class DB {
  contents: DBContents | undefined | null

  constructor(
    public path: string,
    public log: Logger,
  ) {}

  async load(): Promise<DBContents> {
    if (this.contents != null) {
      return this.contents
    }

    let json
    try {
      json = await fs.readJson(this.path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      json = {
        lists: [],
      }
    }

    this.contents = deepFreeze({
      lists: json.lists.map(createServerShoppingList),
    })
    return this.contents
  }

  async write(): Promise<void> {
    this.log.info('Saving DB')
    await writeJsonFile(this.path, this.contents, {
      indent: 2,
    })
    this.log.info('DB save finished')
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
