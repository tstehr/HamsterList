import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { Change, createUUID, UUID } from 'shoppinglist-shared'
import { ListidParam } from 'ShoppingListController'

export default class ChangesController {
  handleGet = (req: Request<ListidParam>, res: Response, next: NextFunction): void => {
    try {
      res.json(getChangesBetween(req.list.changes, this.getUUID(req.query['oldest']), this.getUUID(req.query['newest'])))
    } catch (e) {
      res.status(400).json({
        error: e.message,
      })
    }

    next()
  }

  getUUID(queryParam: string | string[] | void): UUID | undefined | null {
    if (Array.isArray(queryParam)) {
      throw new TypeError('Given parameters must be of type string')
    }

    if (queryParam == null) {
      return null
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
