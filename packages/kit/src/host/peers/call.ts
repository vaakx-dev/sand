import type { RemoteRecord, ServerMessage, WireRequest } from '@sand/protocol'
import { errorMessage } from '../../text/error'
import { fetchHostIdentity, requestTicket } from '../../wire/auth'
import { ticketSocketUrl } from '../../wire/pairing'
import { remoteUrls } from './store'

const identityTimeout = 3000

export class PeerError extends Error {
  constructor(
    readonly state: 'unreachable' | 'refused' | 'failed',
    message: string,
  ) {
    super(message)
  }
}

const socketMessages = { timeout: 'no answer in time', closed: 'the connection closed', failed: 'the connection failed' }

export class SocketError extends Error {
  constructor(readonly kind: keyof typeof socketMessages) {
    super(socketMessages[kind])
  }
}

export const askHost = (url: string, ticket: string, request: WireRequest, timeout = 15_000, sockets = new Set<WebSocket>()) =>
  new Promise<unknown>((resolve, reject) => {
    const socket = new WebSocket(ticketSocketUrl(url, ticket))
    sockets.add(socket)
    let done = false
    const finish = (error?: Error, result?: unknown) => {
      if (done) return
      done = true
      clearTimeout(timer)
      sockets.delete(socket)
      socket.close()
      if (error) reject(error)
      else resolve(result)
    }
    const timer = setTimeout(() => finish(new SocketError('timeout')), timeout)
    socket.onopen = () => socket.send(JSON.stringify({ ...request, id: 1 }))
    socket.onerror = () => finish(new SocketError('failed'))
    socket.onclose = () => finish(new SocketError('closed'))
    socket.onmessage = event => {
      let message: ServerMessage
      try {
        message = JSON.parse(String(event.data)) as ServerMessage
      } catch {
        return
      }
      if (message.type !== 'result' || message.id !== 1) return
      if (message.error) finish(new PeerError('failed', message.error))
      else finish(undefined, message.result)
    }
  })

export const callPeer = async (record: RemoteRecord, request: WireRequest, sockets: Set<WebSocket>, timeout = 15_000): Promise<unknown> => {
  let last = 'no address to try'
  for (const url of remoteUrls(record)) {
    try {
      const identity = await fetchHostIdentity(url, identityTimeout)
      if (identity.deviceId !== record.id) {
        last = 'reached a different PC'
        continue
      }
      const ticket = await requestTicket(url, record.key)
      if (!ticket) throw new PeerError('refused', `${record.name} no longer accepts this PC; pair it again`)
      return await askHost(url, ticket.ticket, request, timeout, sockets)
    } catch (error) {
      if (error instanceof PeerError) throw error
      last = errorMessage(error)
    }
  }
  throw new PeerError('unreachable', `${record.name} is not reachable: ${last}`)
}
