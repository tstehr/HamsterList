import bodyParser from 'body-parser'
import Logger from 'bunyan'
import cors from 'cors'
import express, { NextFunction, Request, RequestParamHandler, Response } from 'express'
import fs from 'fs-extra'
import helmet from 'helmet'
import http from 'http'
import https from 'https'
import nconf from 'nconf'
import path from 'path'
import { createRandomUUID } from 'shoppinglist-shared'
import isErrnoException from 'util/isErrnoException.js'
import CategoriesController from './CategoriesController.js'
import ChangesController from './ChangesController.js'
import CompletionsController from './CompletionsController.js'
import { DB } from './DB.js'
import featurePolicy from './featurePolicy.js'
import ItemController, { ItemidParam } from './ItemController.js'
import OrdersController from './OrdersController.js'
import ShoppingListController, { ListidParam } from './ShoppingListController.js'
import SocketController from './SocketController.js'
import SyncController from './SyncController.js'
import TokenCreator from './TokenCreator.js'

export async function runServer(config: nconf.Provider) {
  const log = Logger.createLogger({
    name: 'shoppinglist',
    serializers: Logger.stdSerializers,
    level: config.get('logLevel'),
  })

  const db = new DB(config.get('databaseFilePath'), log)

  await db.load()

  try {
    doRun(config, db, log)
  } catch (e) {
    log.fatal(e)
  }
}

function doRun(config: nconf.Provider, db: DB, log: Logger) {
  const app = express()

  // Ensure that we can connect to the websocket. If websocketHost === host, 'self' should be sufficient (meaning we wouldn't have
  // to configure host at all in this case). But due to Safari not implementing that spec, we need to explicitly handle that case
  // here.
  // TODO refactor once https://bugs.webkit.org/show_bug.cgi?id=201591 is resolved
  const connectSrc = ["'self'"]
  const websocketHost = config.get<string>('websocketHost') || config.get('host')

  if (config.get('https') || config.get('proxiedHttps')) {
    connectSrc.push(`https://${websocketHost}`, `wss://${websocketHost}`)
  }

  if (config.get('http') && !config.get('proxiedHttps')) {
    connectSrc.push(`http://${websocketHost}`, `ws://${websocketHost}`)
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc,
        },
      },
      expectCt: {
        enforce: true,
        maxAge: 30,
      },
      featurePolicy,
    }),
  )

  // enable cors requests
  app.use(cors())
  // allow cors pre-flight for complex queries on all routers
  app.options('*', cors())

  const router = express.Router()
  router.use(
    // @ts-expect-error -- We should migrate away from deprecated bodyParser. Allowing for now to unblock migration to vite.
    bodyParser.json({
      strict: false,
      limit: '2mb',
    }),
  )

  const tokenCreator = new TokenCreator(config.get('secret'))

  const socketController = new SocketController(tokenCreator, log)

  const shoppingListController = new ShoppingListController(
    db,
    config.get('defaultCategories'),
    tokenCreator,
    socketController.notifiyChanged,
  )
  const itemController = new ItemController()
  const syncController = new SyncController(tokenCreator)
  const categoriesController = new CategoriesController()
  const ordersController = new OrdersController()
  const completionsController = new CompletionsController()
  const changesController = new ChangesController()

  router.param('listid', shoppingListController.handleParamListid as unknown as RequestParamHandler)
  router.param('itemid', itemController.handleParamItemid as unknown as RequestParamHandler)

  router.use('*', (req: Request, res: Response, next: NextFunction) => {
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

  router.get<ListidParam>('/:listid', shoppingListController.handleGet)
  router.put<ListidParam>('/:listid', shoppingListController.handlePut)
  router.get<ListidParam>('/:listid/items', shoppingListController.handleGetItems)

  router.post<ListidParam>('/:listid/items', itemController.handlePost)
  router.get<ItemidParam>('/:listid/items/:itemid', itemController.handleGet)
  router.put<ItemidParam>('/:listid/items/:itemid', itemController.handlePut)
  router.delete<ItemidParam>('/:listid/items/:itemid', itemController.handleDelete)

  router.get<ListidParam>('/:listid/completions', completionsController.handleGet)
  router.delete<ListidParam>('/:listid/completions/:completionname', completionsController.handleDelete)

  router.get<ListidParam>('/:listid/categories', categoriesController.handleGet)
  router.put<ListidParam>('/:listid/categories', categoriesController.handlePut)

  router.get<ListidParam>('/:listid/orders', ordersController.handleGet)
  router.put<ListidParam>('/:listid/orders', ordersController.handlePut)

  router.get<ListidParam>('/:listid/changes', changesController.handleGet)

  router.get<ListidParam>('/:listid/sync', syncController.handleGet)
  router.post<ListidParam>('/:listid/sync', syncController.handlePost)

  router.use<ListidParam>('/:listid', shoppingListController.saveUpdatedList)

  router.use('*', (err: Error, _req: Request<ListidParam>, res: Response, next: NextFunction) => {
    if (err) {
      res.status(500).json({
        error: err.message,
      })
    }
    next()
  })

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
      if (isErrnoException(e) && e.code === 'ENOENT') {
        log.fatal(`File "${e.path}" couldn't be found`)
      } else {
        log.fatal(`Unexpected failure loading https files`, e)
      }
      process.exit(1)
    }

    const server = https.createServer(options, app)
    socketController.initializeFor(server)
    const port = config.get<number>('httpsPort')
    server.listen(port)
    log.info(`HTTPS server listening on port ${port} `)
  }

  if (config.get('http')) {
    const server = http.createServer(app)
    socketController.initializeFor(server)
    const port = config.get<number>('port')
    server.listen(port)
    log.info(`HTTP server listening on port ${port} `)
  }
}
