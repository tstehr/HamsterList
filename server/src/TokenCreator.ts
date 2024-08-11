import crypto from 'crypto'
import stringify from 'json-stable-stringify'
import { SyncedShoppingList } from 'hamsterlist-shared'

export default class TokenCreator {
  secret: string

  static createRandomSecret(): string {
    return crypto.randomBytes(1024).toString('base64')
  }

  constructor(secret: string) {
    this.secret = secret
  }

  setToken(list: SyncedShoppingList): SyncedShoppingList {
    return { ...list, token: this.createToken(list) }
  }

  validateToken(list: SyncedShoppingList): boolean {
    return list.token === this.createToken(list)
  }

  createToken(list: SyncedShoppingList): string {
    const secretList: SyncedShoppingList = { ...list, token: this.secret }
    const secretListJSON = stringify(secretList)
    return crypto.createHash('sha256').update(secretListJSON).digest('hex')
  }
}
