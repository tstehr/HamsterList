import Logger from 'bunyan'
import { ItemidParam } from 'ItemController'
import { UUID } from 'hamsterlist-shared'
import { ServerShoppingList } from './ServerShoppingList.js'
import { ListidParam } from './ShoppingListController.js'

// https://stackoverflow.com/a/55718334
declare module 'express-serve-static-core' {
  interface Request<P> {
    id: UUID
    username: string | undefined | null
    log: Logger
    listid: P extends ListidParam ? string : null
    unnormalizedListid: P extends ListidParam ? string : null
    list: P extends ListidParam ? ServerShoppingList : null
    updatedList?: P extends ListidParam ? ServerShoppingList : null
    itemid: P extends ItemidParam ? UUID : null
  }
}

declare module 'nconf' {
  interface Provider {
    get<T>(key?: string, callback?: ICallbackFunction): T
  }
}
