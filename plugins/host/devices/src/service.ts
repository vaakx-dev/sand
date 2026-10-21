import type { DeviceKind } from '@sand/host-gateway/contract'
import type { Hub } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { hashSecret, randomSecret, sameHash } from '@sand/util/fs'
import { devicesChange, pairUsed, type DeviceRemoval, type HostDevices, type PairedDevice } from './contract'
import type { Invites } from './invites'
import { deviceName } from './names'
import { isDeviceKind, type DeviceRecord, type DeviceStore } from './store'

const seenInterval = 60_000
const leftoverAge = 10 * 60_000

const view = ({ id, name, kind, added, lastSeen }: DeviceRecord): PairedDevice => ({ id, name, kind, added, lastSeen })

export const createHostDevices = (store: DeviceStore, invites: Invites, hub: Pick<Hub, 'broadcast' | 'disconnect'>): HostDevices & { seen(ids: string[]): void } => {
  const listeners = new Set<(removed?: DeviceRemoval) => void>()
  const list = () => store.records().map(view).sort((a, b) => b.added - a.added)
  const find = (id: string) => store.records().find(record => record.id === id)
  const changed = (removed?: DeviceRemoval) => {
    hub.broadcast(devicesChange, list())
    for (const listener of listeners) listener(removed)
  }

  const stale = (record: DeviceRecord, now: number) => now - record.lastSeen >= seenInterval

  const touch = (records: DeviceRecord[]) => {
    const now = Date.now()
    const due = records.filter(record => stale(record, now))
    if (!due.length) return
    for (const record of due) record.lastSeen = now
    store.save().catch(error => console.error(`[hostDevices] could not save devices: ${errorMessage(error)}`))
  }

  const create = async (id: string, name: string, kind: DeviceKind) => {
    const key = randomSecret()
    const now = Date.now()
    store.delete(id)
    const record: DeviceRecord = { id, name: deviceName(name, kind), kind, keyHash: hashSecret(key), added: now, lastSeen: now }
    store.add(record)
    await store.save()
    return { record, key }
  }

  return {
    list,
    seen(ids) {
      touch(store.records().filter(record => ids.includes(record.id)))
    },
    get(id) {
      const record = find(id)
      return record && view(record)
    },
    verify(key) {
      if (!key) return
      const hash = hashSecret(key)
      let found: DeviceRecord | undefined
      for (const record of store.records()) if (sameHash(hash, record.keyHash)) found = record
      if (!found) return
      touch([found])
      return view(found)
    },
    invite: () => invites.create(),
    async redeem({ secret, name, kind, back }) {
      const expires = invites.take(secret)
      if (expires === undefined || !isDeviceKind(kind)) return
      const peer = kind === 'pc' ? back?.device : undefined
      const { record, key } = await create(peer?.id ?? Bun.randomUUIDv7(), peer?.name ?? name, kind)
      const device = view(record)
      changed()
      hub.broadcast(pairUsed, { device, expires })
      return { device, key }
    },
    async mint(peer) {
      const { key } = await create(peer.id, peer.name, 'pc')
      changed()
      return key
    },
    async link(id, peer) {
      const record = find(id)
      if (!record || record.kind !== 'pc') return
      const name = deviceName(peer.name, 'pc')
      const now = Date.now()
      const leftovers = store.records().filter(other => other !== record && other.kind === 'pc' && other.name === name && now - other.lastSeen > leftoverAge)
      if (record.id === peer.id && record.name === name && !leftovers.length) return view(record)
      for (const other of leftovers) store.delete(other.id)
      if (record.id !== peer.id) store.delete(peer.id)
      record.id = peer.id
      record.name = name
      await store.save()
      changed()
      return view(record)
    },
    async rename(id, name) {
      const record = find(id)
      if (!record) throw new Error('Unknown device')
      record.name = deviceName(name, record.kind)
      await store.save()
      changed()
      return view(record)
    },
    async remove(id, { told = false } = {}) {
      const record = find(id)
      if (record && store.delete(id)) {
        await store.save()
        changed({ device: view(record), told })
      }
      hub.disconnect(id)
    },
    onChange(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
