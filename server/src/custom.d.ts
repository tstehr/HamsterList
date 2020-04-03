import { UUID } from 'shoppinglist-shared'
import { ServerShoppingList } from './ServerShoppingList'

// https://stackoverflow.com/a/55718334
declare module 'express-serve-static-core' {
  interface Request {
    id: UUID
    username: string | undefined | null
    log: Logger
    listid: string
    list: ServerShoppingList
    updatedList?: ServerShoppingList
    itemid: UUID
  }
}
