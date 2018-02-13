// @flow
import _ from 'lodash'
import WebSocket from 'ws'
import TokenCreator from './TokenCreator'
import { type ServerShoppingList, getBaseShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export type ShoppingListChangeCallback = (list: ServerShoppingList) => void

export default class SocketController {
  tokenCreator: TokenCreator
  registeredWebSockets: {[string]: WebSocket[]}
  wss: WebSocket.Server

  constructor(tokenCreator: TokenCreator) {
    this.tokenCreator = tokenCreator
    this.registeredWebSockets = {}

    const interval = setInterval(() => {
      const sockets = _.chain(this.registeredWebSockets).values().flatten().value()

      console.log('All connected: ' + sockets.map((ws) => ws.debugIdentifier))

      sockets.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log(`Terminating: ${ws.debugIdentifier}`)
          ws.terminate()
          return
        }

        ws.isAlive = false
        ws.ping('', false, true)
      })
    }, 30000);
  }

  initialize(server: Server) {
    this.wss = new WebSocket.Server({
      server: server
    })

    this.wss.on('connection', (ws, req: Request) => {
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
    if (this.registeredWebSockets[listid] == null) {
      this.registeredWebSockets[listid] = []
    }
    this.registeredWebSockets[listid].push(ws)

    ws.isAlive = true
    
    // $FlowFixMe
    const ua = req.headers['user-agent'] || "UnknownUA"
    // $FlowFixMe
    ws.debugIdentifier = `${listid} ${req.connection.remoteAddress} ${ua.split(' ').pop()}` // TODO

    console.log(`Connected: ${ws.debugIdentifier}`)

    ws.on('message', (msg) => {
      console.log(`Received: ${ws.debugIdentifier}, ${msg}`)
    })

    ws.on('close', () => {
      this.registeredWebSockets[listid].splice(this.registeredWebSockets[listid].indexOf(ws), 1)
      console.log(`Disconnected: ${ws.debugIdentifier}`)
    })

    ws.on('pong', () => {
      ws.isAlive = true;
      console.log(`Pong: ${ws.debugIdentifier}`)
    })

    ws.on('error', (e) => {
      console.log(e)
    })
  }

  notifiyChanged: ShoppingListChangeCallback = (list: ServerShoppingList) => {
    if (this.registeredWebSockets[list.id] != null) {
      for (const ws of this.registeredWebSockets[list.id]) {
        ws.send(this.tokenCreator.createToken(getBaseShoppingList(list)))
      }
    }
  }
}
