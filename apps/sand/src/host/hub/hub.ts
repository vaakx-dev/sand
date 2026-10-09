import type { Hub, HubSocket, RequestHandler, Runtimes } from '@sand/protocol'
import { type Client, createClient, send } from './client'
import { createDownstream } from './downstream'
import { createLinks } from './links'
import { createReceiver } from './receive'

export const createHub = (runtimes: Runtimes) => {
  const clients = new Map<HubSocket, Client>()
  const handlers = new Map<string, RequestHandler>()
  const links = createLinks(runtimes, createDownstream(runtimes))
  const receive = createReceiver({ runtimes, handlers, upstream: links.upstream })

  const forget = (client: Client) => {
    client.open = false
    links.close(client)
  }

  const hub: Hub = {
    open(socket, device) {
      const client = createClient(socket, device)
      clients.set(socket, client)
      links.sync(client)
    },
    message(socket, raw) {
      const client = clients.get(socket)
      if (client) receive(client, raw)
    },
    close(socket) {
      const client = clients.get(socket)
      if (!client) return
      clients.delete(socket)
      forget(client)
    },
    disconnect(device) {
      for (const [socket, client] of clients) {
        if (client.device !== device) continue
        clients.delete(socket)
        forget(client)
        socket.close()
      }
    },
    devices: () => [...new Set([...clients.values()].map(client => client.device))],
    broadcast(event) {
      const raw = JSON.stringify({ type: 'event', name: event.name, args: event.args })
      for (const client of clients.values()) send(client, raw)
    },
    handle(type, handler) {
      const stored = handler as RequestHandler
      handlers.set(type, stored)
      return () => {
        if (handlers.get(type) === stored) handlers.delete(type)
      }
    },
  }

  const sync = () => {
    for (const client of clients.values()) links.sync(client)
  }

  const dispose = () => {
    for (const client of clients.values()) forget(client)
    clients.clear()
  }

  return { hub, sync, dispose }
}
