import {
  type CallOptions,
  type Peers,
  peersChange,
  peersEvent,
  peersListen,
  peersOpened,
  peersRelay,
  peersRetry,
  peersState,
  type PeerView,
} from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import { callEachOf } from '../each'
import { createEvents } from '../links/events'
import { createListeners } from '../links/listeners'
import { createBodies } from './bodies'
import { remoteFetch } from './fetch'
import { hostWait, unwrap } from './outcome'

export const createRemotePeers = (host: HostChannel, report: (error: unknown) => void) => {
  let views: PeerView[] = []
  const events = createEvents()
  const opens = createListeners<[pc: string]>()
  const changes = createListeners<[]>()
  const listened = new Map<string, number>()
  const bodies = createBodies(host)

  const listen = () => void host.call(peersListen, { events: [...listened.keys()] }).catch(report)

  const show = (next: PeerView[]) => {
    views = next
    changes.emit()
  }

  const stops = [
    host.on(peersChange, show),
    host.on(peersOpened, pc => opens.emit(pc)),
    host.on(peersEvent, ({ pc, name, payload }) => events.emit(name, payload, pc)),
  ]

  const call = async <I, O>(pc: string, request: Request<I, O>, input: I, options?: CallOptions) =>
    unwrap(await host.call(peersRelay, { pc, request: request.id, input, timeout: options?.timeout }, hostWait(options?.timeout))) as O

  const connected = () => views.filter(view => view.status.phase === 'connected').map(view => view.id)

  const count = (name: string, step: number) => {
    const next = (listened.get(name) ?? 0) + step
    if (next > 0) listened.set(name, next)
    else listened.delete(name)
    if (next === 1 || next === 0) listen()
  }

  const peers: Peers = {
    list: () => views,
    get: pc => views.find(view => view.id === pc),
    connected,
    call,
    callEach: callEachOf(connected, call),
    fetch: remoteFetch(host, bodies),
    on(event, listener) {
      const stop = events.on(event, listener)
      let on = true
      count(event.id, 1)
      return () => {
        if (!on) return
        on = false
        stop()
        count(event.id, -1)
      }
    },
    hello: () => undefined,
    directUrl(pc) {
      const status = views.find(view => view.id === pc)?.status
      return status?.phase === 'connected' ? status.route.url : undefined
    },
    retry: pc => void host.call(peersRetry, { pc }).catch(report),
    onOpen: opens.add,
    onChange: changes.add,
  }

  return {
    peers,
    async start() {
      listen()
      show(await host.call(peersState, {}))
    },
    close() {
      for (const stop of stops) stop()
      bodies.close()
    },
  }
}
