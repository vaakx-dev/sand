import { connectionPing, deviceParams, devicePaths, type DeviceRecord, type PcRoutes, peersAnnounce, type RouteStore } from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, identityProof, newNonce, sign, signerOf } from '@sand/devices-identity'
import { type ClientMessage, hello } from '@sand/host-hub/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPeerSet, type PeerSet } from '../src/peer-set'
import { fileRouteStore } from '../src/store/file'
import { routeAnnouncer } from '../src/sync/announce'

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

const fakePc = () => {
  const keys = generateKeyPair()
  const id = deviceIdOf(keys.publicKey)
  const announced: unknown[] = []

  const identity = (url: URL) => {
    const nonce = newNonce()
    const signature = sign(identityProof(url.searchParams.get(deviceParams.nonce) ?? '', nonce, id), keys.secretKey)
    return Response.json({ id, name: 'Box', platform: 'linux', publicKey: keys.publicKey, nonce, signature })
  }

  const resultOf = ({ type, input }: ClientMessage) => {
    if (type === hello.id) return { tag: 't', fresh: {} }
    if (type === connectionPing.id) return { at: Date.now() }
    if (type === peersAnnounce.id) announced.push(input)
    return null
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request, server) {
      const url = new URL(request.url)
      if (url.pathname === devicePaths.identity) return identity(url)
      if (url.pathname === devicePaths.ticket) return Response.json({ ticket: 'ticket', expires: Date.now() + 60_000 })
      if (url.pathname === devicePaths.socket && server.upgrade(request)) return undefined
      return new Response('not found', { status: 404 })
    },
    websocket: {
      message(socket, raw) {
        const message: ClientMessage = JSON.parse(String(raw))
        socket.send(JSON.stringify({ type: 'result', id: message.id, result: resultOf(message) }))
      },
    },
  })
  cleanups.push(() => void server.stop(true))

  const record: DeviceRecord = { id, kind: 'pc', name: 'Box', keys: [{ publicKey: keys.publicKey, added: 0 }], added: 0, addedBy: id, updated: 0 }
  return { record, url: server.url.origin, announced, stop: () => server.stop(true) }
}

const savingStore = () => {
  const saved: PcRoutes[] = []
  return { saved, store: { load: () => undefined, save: (_pc: string, routes: PcRoutes) => void saved.push(routes) } }
}

const peerSet = (store: RouteStore = savingStore().store) => {
  const set = createPeerSet(signerOf(generateKeyPair()), store)
  cleanups.push(set.links.close)
  return set
}

const waitFor = async (done: () => boolean, within = 3000) => {
  const until = Date.now() + within
  while (!done() && Date.now() < until) await Bun.sleep(10)
  return done()
}

const connected = (set: PeerSet, pc: string) => set.peers.connected().includes(pc)

const routeUrls = (set: PeerSet, pc: string) => set.peers.get(pc)?.routes.map(entry => entry.route.url) ?? []

test('an added route reaches a PC with no other route, stays out of the route store, and goes once disposed', async () => {
  const box = fakePc()
  const { saved, store } = savingStore()
  const set = peerSet(store)
  set.links.sync([box.record])
  await Bun.sleep(100)
  expect(connected(set, box.record.id)).toBe(false)

  const dispose = set.links.addRoute(box.record.id, `${box.url}/ignored/path`)
  expect(await waitFor(() => connected(set, box.record.id))).toBe(true)
  expect(set.peers.get(box.record.id)?.status).toMatchObject({ phase: 'connected', route: { url: box.url, kind: 'local' } })
  expect(saved.flatMap(routes => routes.routes).some(route => route.url === box.url)).toBe(false)

  dispose()
  box.stop()
  expect(await waitFor(() => !connected(set, box.record.id) && !routeUrls(set, box.record.id).includes(box.url))).toBe(true)
})

test('an advertised route is told to its PC alone, without the network plugin, when the link opens and as it changes', async () => {
  const box = fakePc()
  const other = fakePc()
  const set = peerSet()
  const announcer = routeAnnouncer(set.peers, () => undefined)
  cleanups.push(set.peers.onOpen(announcer.tell))
  set.links.sync([box.record, other.record])

  const first = announcer.advertise(box.record.id, 'http://127.0.0.1:7001')
  cleanups.push(set.links.addRoute(box.record.id, box.url), set.links.addRoute(other.record.id, other.url))
  expect(await waitFor(() => box.announced.length === 1 && connected(set, other.record.id))).toBe(true)
  expect(box.announced[0]).toEqual({ routes: [{ url: 'http://127.0.0.1:7001', kind: 'local' }] })

  const second = announcer.advertise(box.record.id, 'https://box.example:7002/')
  expect(await waitFor(() => box.announced.length === 2)).toBe(true)
  expect(box.announced[1]).toEqual({
    routes: [
      { url: 'http://127.0.0.1:7001', kind: 'local' },
      { url: 'https://box.example:7002', kind: 'lan' },
    ],
  })

  first()
  second()
  expect(await waitFor(() => box.announced.length === 4)).toBe(true)
  expect(box.announced[3]).toEqual({ routes: [] })
  expect(other.announced).toEqual([])
})

test('a loopback route another PC announces gets dialed', async () => {
  const box = fakePc()
  const home = mkdtempSync(join(tmpdir(), 'sand-peers-'))
  cleanups.push(() => rmSync(home, { recursive: true, force: true }))
  const store = await fileRouteStore(home, error => {
    throw error
  })
  const set = peerSet(store)
  set.links.sync([box.record])

  store.publish(box.record.id, [{ url: box.url, kind: 'local' }])
  set.links.renew(box.record.id)
  expect(await waitFor(() => connected(set, box.record.id))).toBe(true)
})
