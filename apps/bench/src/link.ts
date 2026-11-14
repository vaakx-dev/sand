import { connect, createServer, type Socket } from 'node:net'

export interface LinkShape {
  rttMs: number
  downKbps: number
  upKbps: number
}

export interface Traffic {
  up: number
  down: number
  connections: number
}

const lane = (delayMs: number, kbps: number, deliver: (chunk: Buffer) => void) => {
  const bytesPerMs = (kbps * 1000) / 8 / 1000
  const queue: { at: number; chunk: Buffer }[] = []
  let free = 0
  let timer: Timer | undefined
  const flush = () => {
    timer = undefined
    const now = performance.now()
    while (queue.length && queue[0]!.at <= now) deliver(queue.shift()!.chunk)
    if (queue.length) timer = setTimeout(flush, queue[0]!.at - now)
  }
  return (chunk: Buffer) => {
    const now = performance.now()
    free = Math.max(now, free) + chunk.length / bytesPerMs
    queue.push({ at: free + delayMs, chunk })
    if (!timer) timer = setTimeout(flush, Math.max(0, queue[0]!.at - now))
  }
}

export const slowLink = (target: URL, shape: LinkShape) =>
  new Promise<{ origin: string; traffic: Traffic; close(): void }>(resolve => {
    const sockets = new Set<Socket>()
    const traffic: Traffic = { up: 0, down: 0, connections: 0 }
    const server = createServer(client => {
      traffic.connections++
      const upstream = connect(Number(target.port), target.hostname)
      sockets.add(client).add(upstream)
      const up = lane(shape.rttMs / 2, shape.upKbps, chunk => upstream.write(chunk))
      const down = lane(shape.rttMs / 2, shape.downKbps, chunk => client.write(chunk))
      client.on('data', (chunk: Buffer) => {
        traffic.up += chunk.length
        up(chunk)
      })
      upstream.on('data', (chunk: Buffer) => {
        traffic.down += chunk.length
        down(chunk)
      })
      const end = () => {
        setTimeout(() => {
          client.destroy()
          upstream.destroy()
        }, shape.rttMs)
      }
      client.on('close', end).on('error', end)
      upstream.on('close', end).on('error', end)
    })
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      resolve({
        origin: `http://127.0.0.1:${port}`,
        traffic,
        close() {
          for (const socket of sockets) socket.destroy()
          server.close()
        },
      })
    })
  })
