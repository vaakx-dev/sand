import {
  connectionPing,
  deviceParams,
  devicePaths,
  helloProof,
  helloResume,
  type PcConnection,
  type SocketHandlers,
  socketRefused,
  type TicketRefusal,
  type Transport,
} from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, identityProof, newNonce, sign, signerOf, ticketProof, verify } from '@sand/devices-identity'
import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { afterEach } from 'bun:test'
import { connect, directRoute, memoryResumeStore, memoryRouteStore, Unreachable } from '../src'

const pcKeys = generateKeyPair()
const pcId = deviceIdOf(pcKeys.publicKey)
const forgedKeys = generateKeyPair()

export type Answer = 'up' | 'down' | 'hang'

interface FakeSocket {
  silent: boolean
  drop(reason: string): void
}

interface Admitted {
  refusal?: TicketRefusal
  challenge?: string
  nonce?: string
}

export const fakePc = () => {
  const sockets: FakeSocket[] = []
  const answers = new Map<string, Answer>()
  const probed: string[] = []
  const asked: string[] = []
  const nonces = new Set<string>()
  const resumes = new Set<string>()
  const pc = { forged: false, removed: false }

  const proofOf = async (clientNonce: string, nonce: string) => {
    const signature = await sign(identityProof(clientNonce, nonce, pcId), pc.forged ? forgedKeys.secretKey : pcKeys.secretKey)
    return { id: pcId, name: 'Desk', platform: 'linux', publicKey: pcKeys.publicKey, nonce, signature, signedSocket: true }
  }

  const identity = async (path: string) => {
    const nonce = newNonce()
    nonces.add(nonce)
    return Response.json(await proofOf(new URL(path, 'http://pc').searchParams.get(deviceParams.nonce) ?? '', nonce))
  }

  const fresh = (nonce: string) => nonces.delete(nonce) || resumes.delete(nonce)

  const admit = async (path: string): Promise<Admitted> => {
    const params = new URL(path, 'http://pc').searchParams
    if (params.has(deviceParams.ticket)) return {}
    const key = params.get(deviceParams.key) ?? ''
    const nonce = params.get(deviceParams.nonce) ?? ''
    if (!fresh(nonce)) return { refusal: { reason: 'nonce' } }
    if (!(await verify(ticketProof(nonce, pcId, key), params.get(deviceParams.signature) ?? '', key))) return { refusal: { reason: 'unknown' } }
    if (pc.removed) return { refusal: { reason: 'removed', at: 1, by: 'Desk' } }
    return { challenge: params.get(deviceParams.challenge) ?? undefined, nonce }
  }

  const helloOf = async ({ challenge, nonce }: Admitted) => {
    const resume = newNonce()
    resumes.add(resume)
    const proof = challenge && nonce ? { [helloProof.id]: await proofOf(challenge, nonce) } : {}
    return { tag: 't', fresh: { [helloResume.id]: { nonce: resume, expires: Date.now() + 60_000 }, ...proof } }
  }

  const answer = async (handlers: SocketHandlers, socket: FakeSocket, admitted: Admitted, raw: string) => {
    const { type, id }: ClientMessage = JSON.parse(raw)
    if (socket.silent) return
    const result = type === hello.id ? await helloOf(admitted) : type === connectionPing.id ? { at: Date.now() } : undefined
    queueMicrotask(() => handlers.message(JSON.stringify({ type: 'result', id, result })))
  }

  const refuse = (handlers: SocketHandlers, refusal: TicketRefusal) =>
    queueMicrotask(() => {
      handlers.message(JSON.stringify({ type: 'event', name: socketRefused.id, payload: refusal }))
      handlers.closed('refused')
    })

  const transport = (url: string): Transport => ({
    async fetch(path) {
      asked.push(path.split('?')[0]!)
      if (path.startsWith(devicePaths.identity)) probed.push(url)
      const state = answers.get(url) ?? 'up'
      if (state === 'hang') return new Promise<never>(() => {})
      if (state === 'down') throw new Unreachable(`couldn't reach ${url}`)
      if (path.startsWith(devicePaths.identity)) return identity(path)
      return Response.json({ ticket: 'ticket', expires: Date.now() + 60_000 })
    },
    async socket(path, handlers) {
      const admitted = await admit(path)
      const socket: FakeSocket = { silent: false, drop: reason => handlers.closed(reason) }
      sockets.push(socket)
      if (admitted.refusal) refuse(handlers, admitted.refusal)
      return { send: raw => void answer(handlers, socket, admitted, raw), close: () => {} }
    },
  })

  const restart = () => {
    nonces.clear()
    resumes.clear()
  }

  return { transport, sockets, answers, probed, asked, pc, restart }
}

const opened: PcConnection[] = []

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close()
})

export const aDevice = () => ({ signer: signerOf(generateKeyPair()), resume: memoryResumeStore() })

export const connectTo = (pc: ReturnType<typeof fakePc>, urls = ['http://127.0.0.1:4999'], onPc = true, device = aDevice()) => {
  let wake: (cause: string) => void = () => {}
  const connection = connect({
    target: { id: pcId, publicKey: pcKeys.publicKey },
    seeds: urls.map(url => directRoute(url, 'seed')!),
    signer: device.signer,
    transports: { direct: pc.transport, via: () => pc.transport('via') },
    wake: {
      online: () => true,
      onWake(listener) {
        wake = listener
        return () => {}
      },
    },
    store: memoryRouteStore(),
    resume: device.resume,
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
