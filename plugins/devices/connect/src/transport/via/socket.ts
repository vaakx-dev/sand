import { deviceParams, type SocketHandlers, type TransportSocket, type ViaFrame, viaClose, viaOpen, viaSend } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { sendQueue } from './queue'
import type { ViaRelay } from './relay'

const ticketOf = (path: string) => {
  const ticket = new URL(path, 'http://via.invalid').searchParams.get(deviceParams.ticket)
  if (!ticket) throw new Error(`can't open ${path} through another PC`)
  return ticket
}

export const openViaSocket = async (
  relay: ViaRelay,
  pc: string,
  path: string,
  handlers: SocketHandlers,
  timeout: number,
): Promise<TransportSocket> => {
  const ticket = ticketOf(path)
  const early: ViaFrame[] = []
  let stream: string | undefined
  let closed = false

  const finish = (reason: string) => {
    if (closed) return
    closed = true
    stopFrames()
    handlers.closed(reason)
  }

  const deliver = (frame: ViaFrame) => {
    if ('closed' in frame) finish(frame.closed)
    else if (!closed) handlers.message(frame.data)
  }

  const stopFrames = relay.frames(frame => {
    if (stream === undefined) early.push(frame)
    else if (frame.stream === stream) deliver(frame)
  })

  try {
    stream = (await relay.call(viaOpen, { pc, ticket }, { timeout })).stream
  } catch (error) {
    stopFrames()
    throw error
  }
  const opened = stream
  for (const frame of early.splice(0)) if (frame.stream === opened) deliver(frame)
  const outbox = sendQueue()

  return {
    send(data) {
      if (closed) return
      outbox.push(() => relay.call(viaSend, { stream: opened, data }).catch((error: unknown) => finish(`relay lost: ${errorMessage(error)}`)))
    },
    close() {
      if (closed) return
      closed = true
      stopFrames()
      outbox.push(() => relay.call(viaClose, { stream: opened }).catch(() => {}))
    },
  }
}
