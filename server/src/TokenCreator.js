// @flow
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import _ from 'lodash'
import stringify from 'json-stable-stringify'
import { type BaseShoppingList, type SyncedShoppingList, type CategoryDefinition, createShoppingList, createSyncedShoppingList } from 'shoppinglist-shared'

export default class TokenCreator {
  secret: string

  static createRandomSecret() {
    return crypto.randomBytes(1024).toString("base64")
  }

  constructor(secret: string) {
    this.secret = secret
  }

  setToken(list: BaseShoppingList): SyncedShoppingList {
    return createSyncedShoppingList({...list, token: this.createToken(list)}, null)
  }

  validateToken(list: SyncedShoppingList): boolean {
    return list.token === this.setToken(list).token
  }

  createToken(list: BaseShoppingList): string {
    const secretList = createSyncedShoppingList({...list, token: this.secret}, null)
    const secretListJSON = stringify(secretList)
    return crypto.createHash('sha256').update(secretListJSON).digest('hex')
  }
}
