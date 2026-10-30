import type { Runtimes } from '@sand/host-runtimes/contract'
import { callerAllowed, createHandlers } from '@sand/util/wire'
import { type Client, createClient, send } from './client'
import type { Caller, Hub, HubSocket, ServerMessage } from './contract'
import { createDownstream } from './downstream'
import { createGreetings } from './greetings'
import { createLinks } from './links'
import { createReceiver } from './receive'

const eventFrame = (name: string, payload: unknown) => JSON.stringify({ type: 'event', name, payload } satisfies ServerMessage)

export const createHub = (runtimes: Runtimes, opened: (device: string) => void) => {
  const clients = new Map<HubSocket, Client>()
  const leaves = new Set<(caller: Caller) => void>()
  const handlers = createHandlers()
  const greetings = createGreetings()
  const links = createLinks(runtimes, createDownstream(runtimes, greetings))
  const receive = createReceiver({ runtimes, handlers, upstream: links.upstream })

  const forget = (client: Client) => {
    client.open = false
    links.close(client)
    for (const listener of [...leaves]) listener(client.caller)
  }

  const hub: Hub = {
    open(socket, caller) {
      const client = createClient(socket, { ...caller })
      clients.set(socket, client)
      links.sync(client)
      opened(caller.device)
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
        if (client.caller.device !== device) continue
        clients.delete(socket)
        forget(client)
        socket.close()
      }
    },
    devices: () => [...new Set([...clients.values()].map(client => client.caller.device))],
    broadcast(event, payload, to = 'any') {
      const raw = eventFrame(event.id, payload)
      for (const client of clients.values()) if (callerAllowed(to, client.caller.kind)) send(client, raw)
    },
    tell(caller, event, payload) {
      for (const client of clients.values()) if (client.caller === caller) send(client, eventFrame(event.id, payload))
    },
    onLeave(listener) {
      leaves.add(listener)
      return () => void leaves.delete(listener)
    },
    handle: handlers.handle,
    answer: handlers.answer,
    greet: greetings.greet,
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
