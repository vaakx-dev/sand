import type { Runtimes } from '@sand/host-runtimes/contract'
import { createHandlers } from '@sand/util/wire'
import { type Client, createClient, send } from './client'
import type { Hub, HubSocket, ServerMessage } from './contract'
import { createDownstream } from './downstream'
import { createLinks } from './links'
import { createReceiver } from './receive'

export const createHub = (runtimes: Runtimes, opened: (device: string) => void) => {
  const clients = new Map<HubSocket, Client>()
  const handlers = createHandlers()
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
      opened(device)
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
    broadcast(event, payload) {
      const raw = JSON.stringify({ type: 'event', name: event.id, payload } satisfies ServerMessage)
      for (const client of clients.values()) send(client, raw)
    },
    handle: handlers.handle,
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
