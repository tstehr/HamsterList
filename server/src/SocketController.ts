import Logger from 'bunyan'
import http from 'http'
import https from 'https'
import _ from 'lodash'
import { createRandomUUID } from 'shoppinglist-shared'
import WebSocket from 'ws'
import { getSyncedShoppingList, ServerShoppingList } from './ServerShoppingList.js'
import TokenCreator from './TokenCreator.js'
import normalizeListid from './util/normalizeListid.js'

export type ShoppingListChangeCallback = (list: ServerShoppingList) => void

interface LoggingWebSocket extends WebSocket {
  isAlive: boolean
  log: Logger
}

export default class SocketController {
  tokenCreator: TokenCreator
  log: Logger
  registeredWebSockets: Record<string, LoggingWebSocket[]>

  constructor(tokenCreator: TokenCreator, log: Logger) {
    this.tokenCreator = tokenCreator
    this.log = log
    this.registeredWebSockets = {}
    setInterval(() => {
      const sockets = _.chain(this.registeredWebSockets).values().flatten().value()

      this.log.trace(
        sockets.map((ws) => ws.log.fields as unknown),
        'All connected',
      )
      sockets.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.log.debug(`Terminating`)
          ws.terminate()
          return
        }

        try {
          ws.isAlive = false
          ws.ping('', false)
        } catch (e) {
          ws.log.error(e, {
            message: 'Failed to ping websocket',
          })
        }
      })
    }, 30000)
  }

  initializeFor(server: http.Server | https.Server): void {
    const wss = new WebSocket.Server({
      server: server,
    })
    wss.on('connection', (ws, req: Request) => {
      const match = /\/api\/([^/]+)\/socket/.exec(req.url)

      if (match == null) {
        ws.close()
        return
      }

      const listid = normalizeListid(match[1])
      this.handleWs(ws, req, listid)
    })
  }

  handleWs = (baseWs: WebSocket, req: Request, listid: string): void => {
    const ws = this.makeLoggingWebSocket(baseWs, req, listid)

    if (this.registeredWebSockets[listid] == null) {
      this.registeredWebSockets[listid] = []
    }

    this.registeredWebSockets[listid].push(ws)
    ws.isAlive = true
    ws.log.debug(`Connected`)
    ws.on('message', (msg) => {
      ws.log.debug(`Received: ${String(msg)}`)
    })
    ws.on('close', () => {
      this.registeredWebSockets[listid].splice(this.registeredWebSockets[listid].indexOf(ws), 1)
      ws.log.debug(`Disconnected`)
    })
    ws.on('pong', () => {
      ws.isAlive = true
      ws.log.trace(`Pong`)
    })
    ws.on('error', ws.log.error.bind(ws.log))
  }

  makeLoggingWebSocket(baseWs: WebSocket, req: Request, listid: string): LoggingWebSocket {
    const ws = baseWs as LoggingWebSocket
    ws.log = this.log.child({
      id: createRandomUUID(),
      operation: '/socket',
      listid: listid,
    })
    ws.log.info({
      req: req,
    })
    return ws
  }

  notifiyChanged: ShoppingListChangeCallback = (list: ServerShoppingList) => {
    if (this.registeredWebSockets[list.id] != null) {
      for (const ws of this.registeredWebSockets[list.id]) {
        try {
          ws.send(this.tokenCreator.createToken(getSyncedShoppingList(list)))
        } catch (e) {
          ws.log.error(e, {
            message: 'Failed to send message to websocket',
          })
          ws.isAlive = false
        }
      }
    }
  }
}
