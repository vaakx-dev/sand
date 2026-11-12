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
  const asNear = far.askAs({ device: nearId, kind: 'pc' })
  let up = true
  const call: Peers['call'] = (_, request, input) => (up ? asNear(request, input) : Promise.reject(new PcUnavailable(farId, farId, { phase: 'offline' })))
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
      fetch: () => Promise.reject(new Error('no fetch')),
      on: () => () => {},
      hello: () => undefined,
      directUrl: () => undefined,
      retry() {},
      onOpen(listener) {
        opens.add(listener)
        return () => void opens.delete(listener)
      },
      onChange: () => () => {},
    },
    open() {
      up = true
      for (const listener of opens) listener(farId)
    },
    drop() {
      up = false
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
