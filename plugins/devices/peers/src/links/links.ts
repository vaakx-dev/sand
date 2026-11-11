import { directRoute, memoryResumeStore, type ViaRelay } from '@sand/devices-connect'
import { pcWake } from '@sand/devices-connect/pc'
import { type CallOptions, type DeviceRecord, PcUnavailable, type Route, type RouteStore, type Signer, viaFrame } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { Events } from './events'
import { type LinkSetup, openPeerLink, type PeerLink } from './link'
import { pinnedKey, seedsFor } from './seeds'

interface LinksOptions {
  signer: Signer
  store: RouteStore
  events: Events
  opened(pc: string): void
  changed(): void
}

interface Wanted {
  record: DeviceRecord
  seeds: Route[]
  key: string
}

export const notPaired = (pc: string) => new PcUnavailable(pc, pc, { phase: 'blocked', reason: 'not-paired' })

const wantedOf = (record: DeviceRecord, pcs: DeviceRecord[], added: Route[]): Wanted => {
  const seeds = [...added, ...seedsFor(record, pcs)]
  return { record, seeds, key: JSON.stringify({ name: record.name, publicKey: pinnedKey(record), seeds }) }
}

export const createPeerLinks = ({ signer, store, events, opened, changed }: LinksOptions) => {
  const links = new Map<string, PeerLink>()
  const wanted = new Map<string, Wanted>()
  const added = new Map<string, Route[]>()
  let records: DeviceRecord[] = []
  let closed = false

  const call = <I, O>(pc: string, request: Request<I, O>, input: I, options?: CallOptions): Promise<O> => {
    const link = links.get(pc)
    return link ? link.connection.call(request, input, options) : Promise.reject(notPaired(pc))
  }

  const relay = (through: string): ViaRelay => ({
    call: (request, input, options) => call(through, request, input, options),
    frames: listener =>
      events.on(viaFrame, (frame, pc) => {
        if (pc === through) listener(frame)
      }),
  })

  const setup: LinkSetup = {
    signer,
    store,
    resume: memoryResumeStore(),
    wake: pcWake(),
    relay,
    event: (pc, name, payload) => events.emit(name, payload, pc),
    opened,
    changed(pc) {
      queueMicrotask(() => settle(pc))
      changed()
    },
  }

  const replace = (pc: string) => {
    links.get(pc)?.connection.close()
    links.delete(pc)
    const want = wanted.get(pc)
    if (want && !closed) links.set(pc, openPeerLink(want.record, want.seeds, want.key, setup))
    changed()
  }

  const settle = (pc: string) => {
    if (closed) return
    const link = links.get(pc)
    const want = wanted.get(pc)
    if (!want) return link && replace(pc)
    if (!link) return replace(pc)
    link.record = want.record
    if (link.key !== want.key && !link.open()) replace(pc)
  }

  const reconcile = () => {
    wanted.clear()
    for (const record of records) wanted.set(record.id, wantedOf(record, records, added.get(record.id) ?? []))
    for (const pc of new Set([...links.keys(), ...wanted.keys()])) settle(pc)
  }

  const setAdded = (pc: string, routes: Route[]) => {
    if (routes.length) added.set(pc, routes)
    else added.delete(pc)
    reconcile()
  }

  return {
    sync(next: DeviceRecord[]) {
      records = next
      reconcile()
    },
    addRoute(pc: string, url: string): Dispose {
      const route = directRoute(url, 'seed')
      if (!route) throw new Error(`${url} isn't an http or https address`)
      setAdded(pc, [...(added.get(pc) ?? []), route])
      return () => setAdded(pc, added.get(pc)?.filter(known => known !== route) ?? [])
    },
    renew(pc: string) {
      const link = links.get(pc)
      if (link && !link.open()) replace(pc)
    },
    get: (pc: string) => links.get(pc),
    all: () => [...links.values()],
    call,
    close() {
      closed = true
      for (const link of links.values()) link.connection.close()
      links.clear()
      wanted.clear()
    },
  }
}

export type PeerLinks = ReturnType<typeof createPeerLinks>
