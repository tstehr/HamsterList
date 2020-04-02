import bodyParser from 'body-parser'
import bunyan, { Logger } from 'bunyan'
import express, { NextFunction, Response, Request } from 'express'
import fs from 'fs-extra'
import helmet from 'helmet'
import http from 'http'
import https from 'https'
import path from 'path'
import { createRandomUUID } from 'shoppinglist-shared'
import { UUID } from 'shoppinglist-shared'
import CategoriesController from './CategoriesController'
import ChangesController from './ChangesController'
import CompletionsController from './CompletionsController'
import { getConfig } from './config'
import { DB } from './DB'
import ItemController from './ItemController'
import OrdersController from './OrdersController'
import ShoppingListController from './ShoppingListController'
import SocketController from './SocketController'
import SyncController from './SyncController'
import TokenCreator from './TokenCreator'

export type UserRequest = {
  id: UUID
  username: string | undefined | null
  log: Logger
} & Request

const config = getConfig()

var log = bunyan.createLogger({
  name: 'shoppinglist',
  serializers: bunyan.stdSerializers,
  level: config.get('logLevel'),
})

const db = new DB(config.get('databaseFilePath'))
const app = express()
const connectSrc = ["'self'"]
const websocketHost = config.get('websocketHost') || config.get('host')

if (config.get('https')) {
  connectSrc.push(`https://${websocketHost}`, `wss://${websocketHost}`)
}

if (config.get('http')) {
  connectSrc.push(`http://${websocketHost}`, `ws://${websocketHost}`)
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc,
      },
    },
  })
)

db.load()
  .then(() => {
    const router = express.Router()
    router.use(
      bodyParser.json({
        strict: false,
        limit: '2mb',
      })
    )

    const tokenCreator = new TokenCreator(config.get('secret'))

    const socketController = new SocketController(tokenCreator, log)

    const shoppingListController = new ShoppingListController(
      db,
      config.get('defaultCategories'),
      tokenCreator,
      socketController.notifiyChanged
    )
    const itemController = new ItemController()
    const syncController = new SyncController(tokenCreator)
    const categoriesController = new CategoriesController()
    const ordersController = new OrdersController()
    const completionsController = new CompletionsController()
    const changesController = new ChangesController()

    router.param('listid', shoppingListController.handleParamListid)
    router.param('itemid', itemController.handleParamItemid)

    router.use('*', (req: UserRequest, res: Response, next: NextFunction) => {
      req.id = createRandomUUID()
      const encodedUsername = req.get('X-ShoppingList-Username')
      if (encodedUsername !== undefined) {
        try {
          req.username = decodeURIComponent(encodedUsername).trim()
          if (req.username === '') {
            req.username = null
          }
        } catch (e) {
          res.status(400).json({
            error: 'Header field X-ShoppingList-Username is malformed.',
          })
          return
        }
      } else {
        req.username = null
      }

      req.log = log.child({
        id: req.id,
        username: req.username,
      })
      req.log.info({
        req: req,
      })
      next()

      if (!res.headersSent) {
        res.status(404).json({
          error: "This route doesn't exist.",
        })
      }

      req.log.info({
        res: res,
      })
    })

    router.get('/:listid', shoppingListController.handleGet)
    router.put('/:listid', shoppingListController.handlePut)
    router.get('/:listid/items', shoppingListController.handleGetItems)

    router.post('/:listid/items', itemController.handlePost)
    router.get('/:listid/items/:itemid', itemController.handleGet)
    router.put('/:listid/items/:itemid', itemController.handlePut)
    router.delete('/:listid/items/:itemid', itemController.handleDelete)

    router.get('/:listid/completions', completionsController.handleGet)
    router.delete('/:listid/completions/:completionname', completionsController.handleDelete)

    router.get('/:listid/categories', categoriesController.handleGet)
    router.put('/:listid/categories', categoriesController.handlePut)

    router.get('/:listid/orders', ordersController.handleGet)
    router.put('/:listid/orders', ordersController.handlePut)

    router.get('/:listid/changes', changesController.handleGet)

    router.get('/:listid/sync', syncController.handleGet)
    router.post('/:listid/sync', syncController.handlePost)

    router.use('*', shoppingListController.saveUpdatedList)

    app.use('/api', router)

    if (config.get('nodeEnv') === 'production') {
      app.use(express.static('static'))
      app.use((req: Request, res: Response) => res.sendFile(path.resolve('static/index.html')))
    }

    if (config.get('https')) {
      let options
      try {
        options = {
          key: fs.readFileSync(config.get('keyFile')),
          cert: fs.readFileSync(config.get('certFile')),
        }
      } catch (e) {
        log.fatal(`File "${e.path}" couldn't be found`)
        process.exit(1)
        return
      }

      const server = https.createServer(options, app)
      socketController.initializeFor(server)
      const port = config.get('httpsPort')
      server.listen(port)
      log.info(`HTTPS server listening on port ${port} `)
    }

    if (config.get('http')) {
      const server = http.createServer(app)
      socketController.initializeFor(server)
      const port = config.get('port')
      server.listen(port)
      log.info(`HTTP server listening on port ${port} `)
    }
  })
  .catch((e) => {
    log.fatal(e)
  })
