import type { Caller, Hub } from '@sand/host-hub/contract'
import type { Server } from 'bun'
import type { Sessions } from './access/sessions'
import type { Respond } from './http/respond'

const maxPayloadLength = 64 * 1024 * 1024

export interface SocketData {
  caller: Caller
  session: string
}

export type Listen = (hostname: string, port: number) => Server<SocketData>

interface ListenOptions {
  respond: Respond
  hub: Hub
  sessions: Pick<Sessions, 'attach' | 'detach'>
}

export const createListen =
  ({ respond, hub, sessions }: ListenOptions): Listen =>
  (hostname, port) =>
    Bun.serve({
      port,
      hostname,
      ipv6Only: false,
      websocket: {
        data: {} as SocketData,
        maxPayloadLength,
        perMessageDeflate: true,
        open: ws => {
          sessions.attach(ws.data.session, ws)
          hub.open(ws, ws.data.caller)
        },
        message: (ws, data) => hub.message(ws, String(data)),
        close: ws => {
          sessions.detach(ws)
          hub.close(ws)
        },
      },
      fetch: (request, server) =>
        respond(request, {
          address: server.requestIP(request)?.address,
          upgrade: data => server.upgrade(request, { data }),
        }),
    })
