import type { Request } from '@sand/host-hub/contract'
import { pluginsReload } from '@sand/reload/contract'
import { settingsGet, settingsSet } from '@sand/model/contract'
import { uiFocus } from '@sand/server/contract'
import { skillsList } from '@sand/skills/contract'
import { isRecord } from '@sand/util'
import type { Wire } from '../contract'
import type { Store } from '../threads/store'
import type { Hellos } from '../wire/hellos'
import type { HomeWire } from '../wire/wire'
import type { Listeners } from '../wire/listeners'
import type { Links } from './links'

const placed = new Set([uiFocus, settingsGet, settingsSet, skillsList, pluginsReload].map(request => request.id))

const pcFor = (store: Store, request: Request<unknown, unknown>, input: unknown) => {
  if (isRecord(input) && typeof input.session === 'string') return store.deviceOf(input.session)
  if ((isRecord(input) && 'cwd' in input) || placed.has(request.id)) return store.device()
  return store.here()
}

const unknownPc = () => new Error('That PC is no longer paired with this sand')

interface Routed {
  home: HomeWire
  links: Links
  store: Store
  listeners: Listeners
  hellos: Hellos
}

export const routeWire = ({ home, links, store, listeners, hellos }: Routed): Wire => {
  const linkTo = (pc: string) => {
    if (pc === store.here()) return home
    const link = links.get(pc)
    if (!link) throw unknownPc()
    return link
  }
  return {
    state: home.state,
    pairing: home.pairing,
    call: async (request, input, pc = pcFor(store, request, input)) => linkTo(pc).call(request, input),
    on: listeners.on,
    hello: (field, pc = store.here()) => hellos.get(field, pc),
    fetch: async (path, init, pc = store.here()) => linkTo(pc).fetch(path, init),
  }
}
