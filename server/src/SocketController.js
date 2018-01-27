// @flow
import _ from 'lodash'
import WebSocket from 'ws'
import { createToken } from './token'
import { type ServerShoppingList, getBaseShoppingList } from './ServerShoppingList'
import { type ShoppingListRequest } from './ShoppingListController'

export type ShoppingListChangeCallback = (list: ServerShoppingList) => void

export default class SocketController {
  registeredWebSockets: {[string]: WebSocket[]}

  constructor() {
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

  handleWs = (ws: WebSocket, req: ShoppingListRequest) => {
    if (this.registeredWebSockets[req.listid] == null) {
      this.registeredWebSockets[req.listid] = []
    }
    this.registeredWebSockets[req.listid].push(ws)

    ws.isAlive = true
    ws.debugIdentifier = `${req.listid} ${req.connection.remoteAddress} ${req.get('User-Agent').split(' ').pop()}`

    console.log(`Connected: ${ws.debugIdentifier}`)

    ws.on('message', (msg) => {
      console.log(`Received: ${ws.debugIdentifier}, ${msg}`)
    })

    ws.on('close', () => {
      this.registeredWebSockets[req.listid].splice(this.registeredWebSockets[req.listid].indexOf(ws), 1)
      console.log(`Disconnected: ${ws.debugIdentifier}`)
    })

    ws.on('pong', () => {
      ws.isAlive = true;
      console.log(`Pong: ${ws.debugIdentifier}`)
    });
  }

  notifiyChanged: ShoppingListChangeCallback = (list: ServerShoppingList) => {
    if (this.registeredWebSockets[list.id] != null) {
      for (const ws of this.registeredWebSockets[list.id]) {
        ws.send(createToken(getBaseShoppingList(list)))
      }
    }
  }
}
