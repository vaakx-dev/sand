import { type IdentityReply, socketRefused, type TicketRefusal } from '@sand/devices-contract'
import type { Caller, Hub, ServerMessage } from '@sand/host-hub/contract'
import type { Server, ServerWebSocket } from 'bun'
import type { Proofs } from './access/proofs'
import type { Sessions } from './access/sessions'
import type { Respond } from './http/respond'

const maxPayloadLength = 64 * 1024 * 1024
const refusedClose = 4401

export type SocketData = { ok: true; caller: Caller; session: string; proof?: IdentityReply } | { ok: false; refusal: TicketRefusal }

export type Listen = (hostname: string, port: number) => Server<SocketData>

interface ListenOptions {
  respond: Respond
  hub: Hub
  sessions: Pick<Sessions, 'attach' | 'detach'>
  proofs: Pick<Proofs, 'attach'>
}

const refuse = (ws: ServerWebSocket<SocketData>, refusal: TicketRefusal) => {
  const frame: ServerMessage = { type: 'event', name: socketRefused.id, payload: refusal }
  ws.send(JSON.stringify(frame))
  ws.close(refusedClose, refusal.reason)
}

export const createListen =
  ({ respond, hub, sessions, proofs }: ListenOptions): Listen =>
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
          const { data } = ws
          if (!data.ok) return refuse(ws, data.refusal)
          sessions.attach(data.session, ws)
          proofs.attach(ws, data.proof)
          hub.open(ws, data.caller)
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
