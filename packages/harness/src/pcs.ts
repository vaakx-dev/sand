import { PcUnavailable, type Peers, type PeerView, peers } from '@sand/devices-contract'
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

const link = (far: Sand, farId: string, nearId: string): Link => {
  const view = pcView(farId)
  const opens = new Set<(pc: string) => void>()
  const changes = new Set<() => void>()
  const asNear = far.askAs({ device: nearId, kind: 'pc' })
  const fetchAsNear = far.fetchAs({ device: nearId, name: nearId, kind: 'pc' })
  let up = true
  const unavailable = () => new PcUnavailable(farId, farId, { phase: 'offline' })
  const call: Peers['call'] = (_, request, input) => (up ? asNear(request, input) : Promise.reject(unavailable()))
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
      fetch: (_, path, init) => (up ? fetchAsNear(path, init) : Promise.reject(unavailable())),
      on: () => () => {},
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
