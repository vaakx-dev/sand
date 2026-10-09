import type { HubSocket } from '@sand/protocol'
import type { Upstream } from './upstream'

export interface Client {
  readonly socket: HubSocket
  readonly device: string
  readonly upstreams: Map<string, Upstream>
  readonly waiting: Map<number, string>
  readonly hellos: Set<number>
  readonly prompts: Map<string, string>
  queue: Promise<void>
  open: boolean
}

export const createClient = (socket: HubSocket, device: string): Client => ({
  socket,
  device,
  upstreams: new Map(),
  waiting: new Map(),
  hellos: new Set(),
  prompts: new Map(),
  queue: Promise.resolve(),
  open: true,
})

export const send = (client: Client, raw: string) => {
  if (client.open) client.socket.send(raw)
}

export const answer = (client: Client, id: number, outcome: { result?: unknown; error?: string }) =>
  send(client, JSON.stringify({ type: 'result', id, ...outcome }))

export const fail = (client: Client, runtime: string) => {
  for (const [id, owner] of client.waiting) {
    if (owner !== runtime) continue
    client.waiting.delete(id)
    client.hellos.delete(id)
    answer(client, id, { error: 'The sand runtime stopped' })
  }
  for (const [key, owner] of client.prompts) if (owner === runtime) client.prompts.delete(key)
}
