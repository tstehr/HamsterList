// @flow
import _ from 'lodash'
import WebSocket from 'ws'
import { Logger } from 'bunyan'
import { createRandomUUID } from 'shoppinglist-shared'
import TokenCreator from './TokenCreator'
import { type ServerShoppingList, getBaseShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export type ShoppingListChangeCallback = (list: ServerShoppingList) => void

export default class SocketController {
  tokenCreator: TokenCreator
  log: Logger
  registeredWebSockets: {[string]: WebSocket[]}

  constructor(tokenCreator: TokenCreator, log: Logger) {
    this.tokenCreator = tokenCreator
    this.log = log
    this.registeredWebSockets = {}

    const interval = setInterval(() => {
      const sockets = _.chain(this.registeredWebSockets).values().flatten().value()

      this.log.trace(sockets.map((ws) => ws.log.fields), 'All connected' )

      sockets.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.log.debug(`Terminating`)
          ws.terminate()
          return
        }

        ws.isAlive = false
        ws.ping('', false, true)
      })
    }, 30000);
  }

  initializeFor(server: Server) {
    const wss = new WebSocket.Server({
      server: server
    })

    wss.on('connection', (ws, req: Request) => {
      const match = req.url.match(/\/api\/([^\/]+)\/socket/)
      if (match == null) {
        ws.close()
        return
      }
      const listid = match[1]

      this.handleWs(ws, req, listid)
    })
  }

  handleWs = (ws: WebSocket, req: Request, listid: string) => {
    ws.log = this.log.child({id: createRandomUUID(), operation: '/socket', listid: listid})
    ws.log.info({req: req})

    if (this.registeredWebSockets[listid] == null) {
      this.registeredWebSockets[listid] = []
    }
    this.registeredWebSockets[listid].push(ws)

    ws.isAlive = true

    ws.log.debug(`Connected`)

    ws.on('message', (msg) => {
      ws.log.debug(`Received: ${msg}`)
    })

    ws.on('close', () => {
      this.registeredWebSockets[listid].splice(this.registeredWebSockets[listid].indexOf(ws), 1)
      ws.log.debug(`Disconnected`)
    })

    ws.on('pong', () => {
      ws.isAlive = true;
      ws.log.trace(`Pong`)
    })

    ws.on('error', ws.log.error)
  }

  notifiyChanged: ShoppingListChangeCallback = (list: ServerShoppingList) => {
    if (this.registeredWebSockets[list.id] != null) {
      for (const ws of this.registeredWebSockets[list.id]) {
        ws.send(this.tokenCreator.createToken(getBaseShoppingList(list)))
      }
    }
  }
}
