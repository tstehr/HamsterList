// @flow
import express from 'express'
import bodyParser from 'body-parser'
import expressWs from 'express-ws'
import WebSocket from 'ws'
import {
  type ShoppingList, type Item, type LocalItem, type UUID,
  createLocalItemFromString, createLocalItem, createItem, createShoppingList, createRandomUUID, createUUID
} from 'shoppinglist-shared'
import { DB } from './DB'
import { setToken } from './token'
import ShoppingListController from './ShoppingListController'
import ItemController from './ItemController'
import SocketController from './SocketController'
import SyncController from './SyncController'
import CompletionsController from './CompletionsController'
import CategoriesController from './CategoriesController'

const app = express()
expressWs(app)
const db = new DB('data/db.json')

db.load()
  .then(() => {
    const router = express.Router()
    router.use(bodyParser.json({strict: false}))

    const socketController = new SocketController()
    const shoppingListController = new ShoppingListController(db, socketController.notifiyChanged)
    const itemController = new ItemController(db, socketController.notifiyChanged)
    const syncController = new SyncController(db, socketController.notifiyChanged)
    const categoriesController = new CategoriesController(db, socketController.notifiyChanged)
    const completionsController = new CompletionsController()

    router.param('listid', shoppingListController.handleParamListid)
    router.param('itemid', itemController.handleParamItemid)

    router.get('/:listid', shoppingListController.handleGet)
    router.put('/:listid', shoppingListController.handlePut)
    router.get('/:listid/items', shoppingListController.handleGetItems)

    router.post('/:listid/items', itemController.handlePost)
    router.get('/:listid/items/:itemid', itemController.handleGet)
    router.put('/:listid/items/:itemid', itemController.handlePut)
    router.delete('/:listid/items/:itemid', itemController.handleDelete)

    router.get('/:listid/completions', completionsController.handleGet)

    router.get('/:listid/categories', categoriesController.handleGet)
    router.put('/:listid/categories', categoriesController.handlePut)

    router.get('/:listid/sync', syncController.handleGet)
    router.post('/:listid/sync', syncController.handlePost)

    // $FlowFixMe
    router.ws('/:listid/socket', socketController.handleWs)

    router.use('*', (req: express$Request, res: express$Response) => {
      res.status(404).json({error: "This route doesn't exist."})
    })

    var port = process.env.PORT || 4000

    app.use('/api', router)
    if (app.get('env') === 'production') {
      app.use(express.static('../client/build'))
    }
    app.listen(port)
    console.log(`Listening on port ${port}`)
  })
  .catch(e => {
    console.log(e)
  })
