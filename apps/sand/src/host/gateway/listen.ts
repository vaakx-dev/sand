import type { Hub } from '@sand/protocol'
import type { Server } from 'bun'
import type { Respond } from './http/respond'

const maxPayloadLength = 64 * 1024 * 1024

export interface SocketData {
  device: string
}

export type Listen = (hostname: string, port: number) => Server<SocketData>

export const createListen =
  (respond: Respond, hub: Hub): Listen =>
  (hostname, port) =>
    Bun.serve({
      port,
      hostname,
      websocket: {
        data: {} as SocketData,
        maxPayloadLength,
        open: ws => hub.open(ws, ws.data.device),
        message: (ws, data) => hub.message(ws, String(data)),
        close: ws => hub.close(ws),
      },
      fetch: (request, server) =>
        respond(request, {
          address: server.requestIP(request)?.address,
          upgrade: device => server.upgrade(request, { data: { device } }),
        }),
    })
