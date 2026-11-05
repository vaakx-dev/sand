import { connectionPing, deviceParams, devicePaths, type PcConnection, type SocketHandlers, type Transport } from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, identityProof, newNonce, sign, signerOf } from '@sand/devices-identity'
import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { afterEach, expect, test } from 'bun:test'
import { connect, directRoute, memoryRouteStore } from '../src'

const pcKeys = generateKeyPair()
const pcId = deviceIdOf(pcKeys.publicKey)

const fakePc = () => {
  const sockets: { silent: boolean }[] = []

  const identity = (path: string) => {
    const clientNonce = new URL(path, 'http://pc').searchParams.get(deviceParams.nonce) ?? ''
    const nonce = newNonce()
    const signature = sign(identityProof(clientNonce, nonce, pcId), pcKeys.secretKey)
    return Response.json({ id: pcId, name: 'Desk', platform: 'linux', publicKey: pcKeys.publicKey, nonce, signature })
  }

  const answer = (handlers: SocketHandlers, socket: { silent: boolean }, raw: string) => {
    const { type, id }: ClientMessage = JSON.parse(raw)
    if (socket.silent) return
    const result = type === hello.id ? { tag: 't', fresh: {} } : type === connectionPing.id ? { at: Date.now() } : undefined
    queueMicrotask(() => handlers.message(JSON.stringify({ type: 'result', id, result })))
  }

  const transport: Transport = {
    async fetch(path) {
      if (path.startsWith(devicePaths.identity)) return identity(path)
      return Response.json({ ticket: 'ticket', expires: Date.now() + 60_000 })
    },
    async socket(_path, handlers) {
      const socket = { silent: false }
      sockets.push(socket)
      return { send: raw => answer(handlers, socket, raw), close: () => {} }
    },
  }

  return { transport, sockets }
}

const opened: PcConnection[] = []

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close()
})

const connectTo = (pc: ReturnType<typeof fakePc>) => {
  let wake: (cause: string) => void = () => {}
  const connection = connect({
    target: { id: pcId, publicKey: pcKeys.publicKey },
    seeds: [directRoute('http://127.0.0.1:4999', 'seed')!],
    signer: signerOf(generateKeyPair()),
    transports: { direct: () => pc.transport, via: () => pc.transport },
    wake: {
      online: () => true,
      onWake(listener) {
        wake = listener
        return () => {}
      },
    },
    store: memoryRouteStore(),
    secure: false,
    visible: () => true,
    greeting: () => ({ since: null }),
    greeted: () => {},
    event: () => {},
    changed: () => {},
  })
  opened.push(connection)
  return { connection, wake: () => wake('visible') }
}

const waitFor = async (done: () => boolean, within: number) => {
  const until = Date.now() + within
  while (!done() && Date.now() < until) await Bun.sleep(10)
  return done()
}

const connected = (connection: PcConnection) => connection.status().phase === 'connected'

test('waking keeps a socket that still answers', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  wake()
  expect(connection.freshness().state).toBe('checking')
  expect(await waitFor(() => connection.freshness().state === 'live', 200)).toBe(true)
  await Bun.sleep(800)

  expect(pc.sockets).toHaveLength(1)
  expect(connected(connection)).toBe(true)
})

test('waking replaces a socket that went quiet while its PC still answers, without backing off', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  pc.sockets[0]!.silent = true
  const woke = Date.now()
  wake()

  expect(await waitFor(() => pc.sockets.length === 2 && connected(connection), 2000)).toBe(true)
  expect(Date.now() - woke).toBeLessThan(900)
  expect(connection.freshness().state).toBe('live')
})
