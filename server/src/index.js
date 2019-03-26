// @flow
import path from 'path'
import fs from 'fs-extra'
import http from 'http'
import https from 'https'
import express from 'express'
import bodyParser from 'body-parser'
import WebSocket from 'ws'
import nconf from 'nconf'
import camelCase from 'camel-case'
import bunyan, { Logger } from 'bunyan'
import {
  type ShoppingList, type Item, type LocalItem, type UUID,
  createLocalItemFromString, createLocalItem, createItem, createShoppingList, createRandomUUID, createUUID, diffShoppingLists
} from 'shoppinglist-shared'
import { DB } from './DB'
import ShoppingListController, { type ShoppingListRequest } from './ShoppingListController'
import ItemController from './ItemController'
import SocketController from './SocketController'
import SyncController from './SyncController'
import CompletionsController from './CompletionsController'
import CategoriesController from './CategoriesController'
import OrdersController from './OrdersController'
import TokenCreator from './TokenCreator'

export type UserRequest = { username: ?string, log: Logger } & express$Request

var log = bunyan.createLogger({
    name: 'shoppinglist',
    serializers: bunyan.stdSerializers
});


nconf.env({
    lowerCase: true,
    transform: (obj) => {
      const camelCased = camelCase(obj.key)
      if (camelCased.length > 0) {
        obj.key = camelCased
      }
      return obj
    },
    parseValues: true
  })

nconf.argv({parseValues: true})

nconf.defaults({
  configFile: path.resolve('config.json')
})

if(!fs.existsSync(nconf.get('configFile'))) {
  log.info("First run, creating config file with random secret")
  fs.outputJSONSync(nconf.get('configFile'), {
    secret: TokenCreator.createRandomSecret()
  }, { spaces: 2 })
}

nconf.file('user', nconf.get('configFile'))
nconf.required(['secret'])

nconf.file('default', path.resolve('data/config-default.json'))

if (nconf.get('https')) {
  nconf.required(['keyFile', 'certFile', 'httpsPort'])
}
if (nconf.get('http')) {
  nconf.required(['port'])
}
if (!nconf.get('http') && !nconf.get('https')) {
  log.fatal('Either http or https must be enabled!')
  process.exit(1)
}

log.level(nconf.get('logLevel'))


const db = new DB(nconf.get('databaseFilePath'))
const app = express()

db.load()
  .then(() => {
    const router = express.Router()
    router.use(bodyParser.json({strict: false}))

    const tokenCreator = new TokenCreator(nconf.get('secret'))

    const socketController = new SocketController(tokenCreator, log)

    const shoppingListController = new ShoppingListController(db, socketController.notifiyChanged, nconf.get('defaultCategories'))
    const itemController = new ItemController(db, socketController.notifiyChanged)
    const syncController = new SyncController(db, socketController.notifiyChanged, tokenCreator)
    const categoriesController = new CategoriesController(db, socketController.notifiyChanged)
    const ordersController = new OrdersController(db, socketController.notifiyChanged)
    const completionsController = new CompletionsController()

    router.use('*', (req: UserRequest, res: express$Response, next: express$NextFunction) => {
      const encodedUsername = req.get('X-ShoppingList-Username')
      if (encodedUsername !== undefined) {
        try {
          req.username = decodeURIComponent(encodedUsername)
        } catch (e) {
          res.status(400).json({error: "Header field X-ShoppingList-Username is malformed."})
          return
        }
      } else {
        req.username = null
      }

      req.log = log.child({id: createRandomUUID(), username: req.username})
      next()
    })

    router.param('listid', shoppingListController.handleParamListid)
    router.param('itemid', itemController.handleParamItemid)

    router.use('*', (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
      req.log.info({req: req})
      next()
      req.log.info({res: res})
    })



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

    router.get('/:listid/orders', ordersController.handleGet)
    router.put('/:listid/orders', ordersController.handlePut)

    router.get('/:listid/sync', syncController.handleGet)
    router.post('/:listid/sync', syncController.handlePost)

    router.use('*', (req: ShoppingListRequest, res: express$Response, next: express$NextFunction) => {
      const list = db.get().lists.find((list) => list.id == req.list.id)
      req.log.info(diffShoppingLists(req.list, list))
      next()
    })

    router.use('*', (req: express$Request, res: express$Response) => {
      if (!res.headersSent) {
        res.status(404).json({error: "This route doesn't exist."})
      }
    })


    app.use('/api', router)

    if (nconf.get('nodeEnv') === 'production') {
      app.use(express.static('static'))
      app.use((req: express$Request, res: express$Response) => res.sendFile(path.resolve('static/index.html')))
    }


    if (nconf.get('https')) {
      let options
      try {
        options = {
          key: fs.readFileSync(nconf.get('keyFile')),
          cert: fs.readFileSync(nconf.get('certFile'))
        }
      } catch (e) {
        log.fatal(`File "${e.path}" couldn't be found`)
        process.exit(1)
        return
      }

      const server = https.createServer(options, app)

      socketController.initializeFor(server)

      var port = nconf.get('httpsPort')
      server.listen(port)
      log.info(`HTTPS server listening on port ${port} `)
    }

    if (nconf.get('http')) {
      const server = http.createServer(app)
      socketController.initializeFor(server)

      var port = nconf.get('port')
      server.listen(port)
      log.info(`HTTP server listening on port ${port} `)
    }
  })
  .catch(e => {
    log.fatal(e)
  })
