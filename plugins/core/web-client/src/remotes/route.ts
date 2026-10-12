import type { WireRequest } from '@sand/protocol'
import type { Wire } from '../contract'
import type { Store } from '../threads/store'
import type { Links } from './links'

const placed = new Set<WireRequest['type']>(['ui.command', 'ui.focus', 'settings.get', 'skills.list'])

const pcFor = (store: Store, request: WireRequest) => {
  if ('session' in request && typeof request.session === 'string') return store.deviceOf(request.session)
  if ('cwd' in request || placed.has(request.type)) return store.device()
  return store.here()
}

const unknownPc = () => new Error('That PC is no longer paired with this sand')

export const routeWire = (wire: Wire, links: Links, store: Store): Wire => {
  const linkTo = (pc: string) => {
    if (pc === store.here()) return wire
    const link = links.get(pc)
    if (!link) throw unknownPc()
    return link
  }
  return {
    ...wire,
    call: async <T>(request: WireRequest, pc = pcFor(store, request)) => linkTo(pc).call<T>(request),
    fetch: async (path, init, pc = store.here()) => linkTo(pc).fetch(path, init),
  }
}
