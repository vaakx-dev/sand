import type { Socket } from 'bun'
import { firstListening } from './listen'

interface Target {
  hostname: string
  port: number
}

interface Pipe {
  peer?: Socket<Pipe>
  outgoing: Uint8Array[]
  held: Uint8Array[]
}

const flush = (socket: Socket<Pipe>) => {
  const { outgoing } = socket.data
  while (outgoing.length) {
    const next = outgoing[0]!
    const written = socket.write(next)
    if (written < next.byteLength) {
      outgoing[0] = next.subarray(Math.max(0, written))
      return
    }
    outgoing.shift()
  }
}

const write = (socket: Socket<Pipe>, data: Uint8Array) => {
  socket.data.outgoing.push(data)
  flush(socket)
}

const pipeHandlers = {
  data(socket: Socket<Pipe>, data: Buffer) {
    const copy = new Uint8Array(data)
    if (socket.data.peer) write(socket.data.peer, copy)
    else socket.data.held.push(copy)
  },
  drain: flush,
  close: (socket: Socket<Pipe>) => void socket.data.peer?.end(),
  error: (socket: Socket<Pipe>) => void socket.data.peer?.end(),
}

const freshPipe = (peer?: Socket<Pipe>): Pipe => ({ peer, outgoing: [], held: [] })

export const createRelay = (target: Target, hostnames: string[], failed: () => void) => {
  const connect = async (visitor: Socket<Pipe>) => {
    visitor.data = freshPipe()
    try {
      const upstream = await Bun.connect<Pipe>({ ...target, data: freshPipe(visitor), socket: pipeHandlers })
      visitor.data.peer = upstream
      visitor.data.held.splice(0).forEach(data => write(upstream, data))
    } catch {
      visitor.end()
      failed()
    }
  }

  const server = firstListening(hostnames, hostname => Bun.listen<Pipe>({ hostname, port: 0, socket: { ...pipeHandlers, open: visitor => void connect(visitor) } }))

  return { port: server.port, stop: () => server.stop(true) }
}

export type Relay = ReturnType<typeof createRelay>
