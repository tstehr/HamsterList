import { NextFunction, Request, Response } from 'express'
import { Query } from 'express-serve-static-core'
import _ from 'lodash'
import { Change, createUUID, UUID } from 'shoppinglist-shared'
import sendErrorResponse from './util/sendErrorResponse.js'
import { ListidParam } from './ShoppingListController.js'

export default class ChangesController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    try {
      res.json(getChangesBetween(req.list.changes, this.getUUID(req.query.oldest), this.getUUID(req.query.newest)))
    } catch (e) {
      sendErrorResponse(res, e)
    }

    next()
  }

  getUUID(queryParam: Query[string]): UUID | undefined | null {
    if (queryParam == null) {
      return null
    }

    if (typeof queryParam !== 'string') {
      throw new TypeError('Given parameters must be of type string')
    }

    return createUUID(queryParam)
  }
}

export function getChangesBetween(changes: readonly Change[], oldest?: UUID | null, newest?: UUID | null): readonly Change[] {
  const oldestIndex = _.findIndex(changes, (c) => c.id === oldest)
  const startIndex = oldestIndex === -1 ? 0 : oldestIndex
  const newestIndex = _.findIndex(changes, (c) => c.id === newest)
  const endIndex = newestIndex === -1 ? changes.length : newestIndex + 1

  return changes.slice(startIndex, endIndex)
}
