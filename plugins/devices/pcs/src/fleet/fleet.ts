import { directRoute, type ViaRelay, viaRoute } from '@sand/devices-connect'
import { type DeviceRecord, helloPc, PcUnavailable, type PcView, type Signer, viaFrame } from '@sand/devices-contract'
import type { HelloField } from '@sand/host-hub/contract'
import { knownPcs } from './known'
import { openPcLink, type PcLink } from './link'
import { wireListeners } from './listeners'
import { fallbackName, viewOf } from './view'

export interface FleetOptions {
  home: string
  signer: Signer
  since(pc: string): string | undefined
  greeted(pc: string, retagged: boolean): void
  changed(): void
}

const homeSeeds = () => [directRoute(location.origin, 'seed')].filter(route => route !== undefined)

export const createFleet = (options: FleetOptions) => {
  const { home } = options
  const known = knownPcs()
  const listeners = wireListeners()
  const links = new Map<string, PcLink>()

  const nameOf = (pc: string) => links.get(pc)?.connection.identity()?.name ?? known.get(pc)?.name ?? fallbackName(pc === home)

  const unavailable = (pc: string) => new PcUnavailable(pc, nameOf(pc), links.get(pc)?.connection.status() ?? { phase: 'offline' })

  const relay = (through: string): ViaRelay => ({
    call: (request, input, call) => links.get(through)?.connection.call(request, input, call) ?? Promise.reject(unavailable(through)),
    frames: listener => listeners.on(viaFrame, (frame, pc) => pc === through && listener(frame), { from: 'all' }),
  })

  const connected = new Set<string>()

  const noteSeen = (pc: string) => {
    const online = links.get(pc)?.connection.status().phase === 'connected'
    const was = connected.has(pc)
    if (online) connected.add(pc)
    else connected.delete(pc)
    if (online || was) known.saw(pc, Date.now(), online !== was)
  }

  const learnName = (pc: string) => {
    const identity = links.get(pc)?.hellos.read(helloPc)
    if (identity && known.learn(identity)) options.changed()
  }

  const open = (pc: string) => {
    const name = known.get(pc)?.name
    links.set(
      pc,
      openPcLink({
        pc,
        ...(name && { name }),
        seeds: pc === home ? homeSeeds() : [viaRoute(home)],
        signer: options.signer,
        relay,
        since: () => options.since(pc),
        greeted(retagged) {
          learnName(pc)
          options.greeted(pc, retagged)
        },
        event: (eventName, payload) => listeners.dispatch(eventName, payload, pc, pc === home),
        identified(identity) {
          if (known.learn(identity)) options.changed()
        },
        changed() {
          noteSeen(pc)
          options.changed()
        },
      }),
    )
  }

  const drop = (pc: string) => {
    links.get(pc)?.connection.close()
    links.delete(pc)
    connected.delete(pc)
    known.forget(pc)
  }

  const sync = (records: DeviceRecord[]) => {
    const pcs = records.filter(record => record.kind === 'pc' && !record.removed)
    const wanted = new Set(pcs.map(record => record.id))
    for (const record of pcs) {
      known.learn({ id: record.id, name: record.name, ...(record.platform && { platform: record.platform }) })
      if (!links.has(record.id)) open(record.id)
    }
    for (const pc of [...links.keys()]) if (pc !== home && !wanted.has(pc)) drop(pc)
    options.changed()
  }

  const view = (pc: string): PcView | undefined => {
    const link = links.get(pc)
    return link && viewOf(link, pc === home, known.get(pc))
  }

  open(home)
  for (const pc of known.ids()) if (!links.has(pc)) open(pc)

  return {
    home,
    link: (pc: string) => links.get(pc),
    connection(pc: string) {
      const link = links.get(pc)
      if (!link) throw unavailable(pc)
      return link.connection
    },
    ready: (pc: string) => links.get(pc)?.connection.status().phase === 'connected',
    hello: <T>(field: HelloField<T>, pc: string) => links.get(pc)?.hellos.read(field),
    on: listeners.on,
    nameOf,
    view,
    views: () => [...links.keys()].map(view).filter(found => found !== undefined),
    retry(pc?: string) {
      if (pc) return links.get(pc)?.connection.retry()
      for (const link of links.values()) link.connection.retry()
    },
    sync,
    close() {
      for (const link of links.values()) link.connection.close()
      links.clear()
    },
  }
}

export type Fleet = ReturnType<typeof createFleet>
