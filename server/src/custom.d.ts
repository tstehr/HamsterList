import { ItemidParam } from 'ItemController'
import { UUID } from 'shoppinglist-shared'
import { ListidParam } from 'ShoppingListController'
import { ServerShoppingList } from './ServerShoppingList'

// https://stackoverflow.com/a/55718334
declare module 'express-serve-static-core' {
  interface Request<P> {
    id: UUID
    username: string | undefined | null
    log: Logger
    listid: P extends ListidParam ? string : null
    list: P extends ListidParam ? ServerShoppingList : null
    updatedList?: P extends ListidParam ? ServerShoppingList : null
    itemid: P extends ItemidParam ? UUID : null
  }
}
