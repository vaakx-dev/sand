import { PcUnavailable, peerError, type Peers, type PeerView, peers } from '@sand/devices-contract'
import { parseInput } from '@sand/host-hub/contract'
import type { Sand } from './index'

interface Link {
  peers: Peers
  open(): void
  drop(): void
}

const pcView = (id: string): PeerView => ({
  id,
  name: id,
  status: { phase: 'connected', route: { key: 'lan', kind: 'lan', source: 'seed', url: `http://${id}` }, since: 0 },
  routes: [],
  attempts: [],
})

const severable = (body: ReadableStream<Uint8Array>, cuts: Set<() => void>) => {
  const reader = body.getReader()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      cuts.add(() => controller.error(new Error('the connection dropped')))
    },
    async pull(controller) {
      const { value, done } = await reader.read()
      if (done) controller.close()
      else controller.enqueue(value)
    },
    cancel: reason => reader.cancel(reason),
  })
}

const link = (far: Sand, farId: string, nearId: string): Link => {
  const view = pcView(farId)
  const opens = new Set<(pc: string) => void>()
  const changes = new Set<() => void>()
  const cuts = new Set<() => void>()
  const asNear = far.askAs({ device: nearId, kind: 'pc' })
  const fetchAsNear = far.fetchAs({ device: nearId, name: nearId, kind: 'pc' })
  let up = true
  const unavailable = () => new PcUnavailable({ pc: farId, name: farId, status: { phase: 'offline' }, reason: 'disconnected' })
  const call: Peers['call'] = async (_, request, input) => {
    if (!up) throw unavailable()
    await parseInput(request, input)
    return asNear(request, input).catch((error: unknown) => {
      throw peerError(error, { pc: farId, name: farId, status: view.status })
    })
  }
  return {
    peers: {
      list: () => [view],
      get: pc => (pc === farId ? view : undefined),
      connected: () => (up ? [farId] : []),
      call,
      callEach: (request, input) =>
        call(farId, request, input).then(
          value => [{ pc: farId, ok: true, value }],
          (error: unknown) => [{ pc: farId, ok: false, error }],
        ),
      async fetch(_, path, init) {
        if (!up) throw unavailable()
        const response = await fetchAsNear(path, init)
        return response.body ? new Response(severable(response.body, cuts), response) : response
      },
      on: (event, listener) => far.hear(event, payload => up && listener(payload, farId)),
      hello: () => undefined,
      directUrl: () => undefined,
      retry() {},
      onOpen(listener) {
        opens.add(listener)
        return () => void opens.delete(listener)
      },
      onChange(listener) {
        changes.add(listener)
        return () => void changes.delete(listener)
      },
    },
    open() {
      up = true
      for (const listener of changes) listener()
      for (const listener of opens) listener(farId)
    },
    drop() {
      up = false
      for (const cut of cuts) cut()
      cuts.clear()
      for (const listener of changes) listener()
    },
  }
}

const pairPcs = (home: Sand, box: Sand) => {
  const toBox = link(box, 'box', 'home')
  const toHome = link(home, 'home', 'box')
  home.app.provide(peers, toBox.peers)
  box.app.provide(peers, toHome.peers)
  return { toBox, toHome }
}

export { pairPcs }
