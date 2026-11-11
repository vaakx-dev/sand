import { connectionPing, deviceParams, devicePaths, type PcConnection, type SocketHandlers, type Transport } from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, identityProof, newNonce, sign, signerOf } from '@sand/devices-identity'
import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { afterEach } from 'bun:test'
import { connect, directRoute, memoryRouteStore, Unreachable } from '../src'

const pcKeys = generateKeyPair()
const pcId = deviceIdOf(pcKeys.publicKey)

export type Answer = 'up' | 'down' | 'hang'

interface FakeSocket {
  silent: boolean
  drop(reason: string): void
}

export const fakePc = () => {
  const sockets: FakeSocket[] = []
  const answers = new Map<string, Answer>()
  const probed: string[] = []

  const identity = async (path: string) => {
    const clientNonce = new URL(path, 'http://pc').searchParams.get(deviceParams.nonce) ?? ''
    const nonce = newNonce()
    const signature = await sign(identityProof(clientNonce, nonce, pcId), pcKeys.secretKey)
    return Response.json({ id: pcId, name: 'Desk', platform: 'linux', publicKey: pcKeys.publicKey, nonce, signature })
  }

  const answer = (handlers: SocketHandlers, socket: FakeSocket, raw: string) => {
    const { type, id }: ClientMessage = JSON.parse(raw)
    if (socket.silent) return
    const result = type === hello.id ? { tag: 't', fresh: {} } : type === connectionPing.id ? { at: Date.now() } : undefined
    queueMicrotask(() => handlers.message(JSON.stringify({ type: 'result', id, result })))
  }

  const transport = (url: string): Transport => ({
    async fetch(path) {
      if (path.startsWith(devicePaths.identity)) probed.push(url)
      const state = answers.get(url) ?? 'up'
      if (state === 'hang') return new Promise<never>(() => {})
      if (state === 'down') throw new Unreachable(`couldn't reach ${url}`)
      if (path.startsWith(devicePaths.identity)) return identity(path)
      return Response.json({ ticket: 'ticket', expires: Date.now() + 60_000 })
    },
    async socket(_path, handlers) {
      const socket: FakeSocket = { silent: false, drop: reason => handlers.closed(reason) }
      sockets.push(socket)
      return { send: raw => answer(handlers, socket, raw), close: () => {} }
    },
  })

  return { transport, sockets, answers, probed }
}

const opened: PcConnection[] = []

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close()
})

export const connectTo = (pc: ReturnType<typeof fakePc>, urls = ['http://127.0.0.1:4999'], onPc = true) => {
  let wake: (cause: string) => void = () => {}
  const connection = connect({
    target: { id: pcId, publicKey: pcKeys.publicKey },
    seeds: urls.map(url => directRoute(url, 'seed')!),
    signer: signerOf(generateKeyPair()),
    transports: { direct: pc.transport, via: () => pc.transport('via') },
    wake: {
      online: () => true,
      onWake(listener) {
        wake = listener
        return () => {}
      },
    },
    store: memoryRouteStore(),
    secure: false,
    onPc,
    visible: () => true,
    greeting: () => ({ since: null }),
    greeted: () => {},
    event: () => {},
    changed: () => {},
  })
  opened.push(connection)
  return { connection, wake: () => wake('visible') }
}

export const waitFor = async (done: () => boolean, within: number) => {
  const until = Date.now() + within
  while (!done() && Date.now() < until) await Bun.sleep(10)
  return done()
}

export const connected = (connection: PcConnection) => connection.status().phase === 'connected'
