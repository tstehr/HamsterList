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
import {
  type ShoppingList, type Item, type LocalItem, type UUID,
  createLocalItemFromString, createLocalItem, createItem, createShoppingList, createRandomUUID, createUUID
} from 'shoppinglist-shared'
import { DB } from './DB'
import ShoppingListController from './ShoppingListController'
import ItemController from './ItemController'
import SocketController from './SocketController'
import SyncController from './SyncController'
import CompletionsController from './CompletionsController'
import CategoriesController from './CategoriesController'
import TokenCreator from './TokenCreator'

nconf.env({
    lowerCase: true,
    transform: (obj) => {
      const camelCased = camelCase(obj.key)
      if (camelCased.length > 0) {
        obj.key = camelCased
      }
      return obj
    }
  })

nconf.argv()

nconf.defaults({
  configFile: path.resolve('config.json')
})

if(!fs.existsSync(nconf.get('configFile'))) {
  console.log("First run, creating config file with random secret")
  fs.outputJSONSync(nconf.get('configFile'), {
    secret: TokenCreator.createRandomSecret()
  }, { spaces: 2 })
}

nconf.file('user', nconf.get('configFile'))
nconf.required(['secret'])

if (nconf.get('https')) {
  nconf.required(['keyFile', 'certFile'])
}

nconf.file('default', path.resolve('data/config-default.json'))


const db = new DB(nconf.get('databaseFilePath'))
const app = express()

db.load()
  .then(() => {
    const router = express.Router()
    router.use(bodyParser.json({strict: false}))

    const tokenCreator = new TokenCreator(nconf.get('secret'))

    const socketController = new SocketController(tokenCreator)

    const shoppingListController = new ShoppingListController(db, socketController.notifiyChanged, nconf.get('defaultCategories'))
    const itemController = new ItemController(db, socketController.notifiyChanged)
    const syncController = new SyncController(db, socketController.notifiyChanged, tokenCreator)
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

    router.use('*', (req: express$Request, res: express$Response) => {
      res.status(404).json({error: "This route doesn't exist."})
    })

    app.use('/api', router)

    if (nconf.get('nodeEnv') === 'production') {
      app.use(express.static('../client/build'))
      app.use((req: express$Request, res: express$Response) => res.sendFile(path.resolve('../client/build/index.html')))
    }

    var server: Server
    if (nconf.get('https')) {
      try {
        server = https.createServer({
          key: fs.readFileSync(nconf.get('keyFile')),
          cert: fs.readFileSync(nconf.get('certFile'))
        }, app)
      } catch (e) {
        console.error(`File "${e.path}" couldn't be found`)
        process.exit(1)
      }
    } else {
      server = http.createServer(app)
    }

    socketController.initialize(server)

    var port = nconf.get('port')
    // $FlowFixMe
    server.listen(port)
    console.log(`Listening as ${nconf.get('https') ? 'https' : 'http'} server on port ${port} `)
  })
  .catch(e => {
    console.log(e)
  })
