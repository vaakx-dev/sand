import type { Wire, WireRequest } from '@sand/protocol'
import type { Store } from '../threads/store'
import type { Links } from './links'

export const thisDevice = ''

const placed = new Set<WireRequest['type']>(['ui.command', 'ui.focus', 'settings.get', 'skills.list'])

const deviceFor = (store: Store, request: WireRequest) => {
  if ('session' in request && typeof request.session === 'string') return store.threads.get(request.session)?.device
  if ('cwd' in request || placed.has(request.type)) return store.device()
}

const unknownPc = () => new Error('That PC is no longer paired with this sand')

export const routeWire = (wire: Wire, links: Links, store: Store): Wire => ({
  ...wire,
  call<T>(request: WireRequest, device = deviceFor(store, request)) {
    if (!device) return wire.call<T>(request)
    const link = links.get(device)
    return link ? link.call<T>(request) : Promise.reject(unknownPc())
  },
  fetch(path, init, device) {
    if (!device) return wire.fetch(path, init)
    const link = links.get(device)
    return link ? link.fetch(path, init) : Promise.reject(unknownPc())
  },
})
