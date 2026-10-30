import { deviceParams, devicePaths, type ViaFrame, viaFrame } from '@sand/devices-contract'
import type { Caller, Hub } from '@sand/host-hub/contract'

interface Stream {
  owner: Caller
  socket: WebSocket
}

const openTimeout = 10_000
const maxPerCaller = 16

const socketUrl = (base: string, ticket: string) => {
  const url = new URL(devicePaths.socket, base)
  url.searchParams.set(deviceParams.ticket, ticket)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

export const createStreams = (hub: Pick<Hub, 'tell'>) => {
  const streams = new Map<string, Stream>()
  const departed = new WeakSet<Caller>()

  const frame = (owner: Caller, payload: ViaFrame) => hub.tell(owner, viaFrame, payload)

  const countOf = (owner: Caller) => [...streams.values()].filter(stream => stream.owner === owner).length

  const owned = (id: string, caller: Caller) => {
    const stream = streams.get(id)
    if (!stream || stream.owner !== caller) throw new Error('That stream is closed')
    return stream
  }

  const open = (base: string, ticket: string, owner: Caller) =>
    new Promise<{ stream: string }>((resolve, reject) => {
      if (countOf(owner) >= maxPerCaller) return reject(new Error('Too many streams are open through this PC'))
      const id = crypto.randomUUID()
      const socket = new WebSocket(socketUrl(base, ticket))
      let opened = false
      const timer = setTimeout(() => {
        reject(new Error(`${base} didn't open a socket in time`))
        socket.close()
      }, openTimeout)

      socket.addEventListener('open', () => {
        clearTimeout(timer)
        if (departed.has(owner)) return socket.close()
        opened = true
        streams.set(id, { owner, socket })
        resolve({ stream: id })
      })
      socket.addEventListener('message', event => {
        if (streams.get(id)?.socket === socket) frame(owner, { stream: id, data: String(event.data) })
      })
      socket.addEventListener('close', event => {
        clearTimeout(timer)
        if (!opened) return reject(new Error(`${base} refused the socket`))
        if (streams.get(id)?.socket !== socket) return
        streams.delete(id)
        frame(owner, { stream: id, closed: event.reason || `socket closed (${event.code})` })
      })
    })

  const send = (id: string, data: string, caller: Caller) => {
    const { socket } = owned(id, caller)
    if (socket.readyState !== WebSocket.OPEN) throw new Error('That stream is closed')
    socket.send(data)
  }

  const close = (id: string, caller: Caller) => {
    const { socket } = owned(id, caller)
    streams.delete(id)
    socket.close()
  }

  const leave = (caller: Caller) => {
    departed.add(caller)
    for (const [id, stream] of streams) {
      if (stream.owner !== caller) continue
      streams.delete(id)
      stream.socket.close()
    }
  }

  const closeAll = () => {
    for (const stream of streams.values()) stream.socket.close()
    streams.clear()
  }

  return { open, send, close, leave, closeAll }
}
