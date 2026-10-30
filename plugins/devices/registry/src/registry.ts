import type { AddedKey, DeviceRecord, NewDevice, Registry } from '@sand/devices-contract'
import { deviceIdOf } from '@sand/devices-identity'
import type { Dispose } from 'drydock'
import type { DeviceFile } from './store/file'
import { isSound, mergeRecord, normalRecord } from './store/merge'
import { deviceName } from './store/names'

type Listener<T> = (value: T) => void

const listen = <T>(listeners: Set<Listener<T>>, listener: Listener<T>): Dispose => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export interface HostRegistry extends Registry {
  onRevoke(listener: (device: string) => void): Dispose
}

export const createRegistry = (file: DeviceFile): HostRegistry => {
  const records = new Map(file.saved.filter(isSound).map(record => [record.id, normalRecord(record)]))
  const keys = new Map<string, string>()
  const changes = new Set<Listener<DeviceRecord[]>>()
  const revokes = new Set<Listener<string>>()

  const index = () => {
    keys.clear()
    for (const record of records.values()) for (const key of record.keys) if (!keys.has(key.publicKey)) keys.set(key.publicKey, record.id)
  }
  index()

  const stamp = (record: DeviceRecord) => Math.max(Date.now(), record.updated + 1)

  const commit = async (changed: DeviceRecord[]) => {
    if (!changed.length) return
    const revoked = changed.filter(record => record.removed && !records.get(record.id)?.removed)
    for (const record of changed) records.set(record.id, record)
    index()
    await file.save([...records.values()])
    for (const record of revoked) for (const listener of revokes) listener(record.id)
    for (const listener of changes) listener(changed)
  }

  const live = (id: string) => {
    const record = records.get(id)
    if (!record) throw new Error('There is no such device')
    if (record.removed) throw new Error(`${record.name} was removed`)
    return record
  }

  const change = async (record: DeviceRecord) => {
    await commit([record])
    return record
  }

  const add = async (device: NewDevice, by: string) => {
    const id = deviceIdOf(device.publicKey)
    const known = records.get(keys.get(device.publicKey) ?? id)
    const name = deviceName(device.name, device.kind)
    if (known?.removed) {
      const now = Date.now()
      return change(normalRecord({ ...known, removed: undefined, kind: device.kind, name, ...(device.platform && { platform: device.platform }), added: now, addedBy: by, updated: stamp(known) }))
    }
    if (known) {
      if (known.name === name && known.platform === device.platform) return known
      return change(normalRecord({ ...known, name, ...(device.platform && { platform: device.platform }), updated: stamp(known) }))
    }
    const now = Date.now()
    const key = { publicKey: device.publicKey, added: now, ...(device.origin && { origin: device.origin }) }
    return change(normalRecord({ id, kind: device.kind, name, platform: device.platform, keys: [key], added: now, addedBy: by, updated: now }))
  }

  const addKey = async (id: string, key: AddedKey) => {
    const record = live(id)
    const owner = keys.get(key.publicKey)
    if (owner === id) return record
    if (owner) throw new Error('This key already belongs to another device')
    const added = { publicKey: key.publicKey, added: Date.now(), ...(key.origin && { origin: key.origin }) }
    return change(normalRecord({ ...record, keys: [...record.keys, added], updated: stamp(record) }))
  }

  const rename = async (id: string, name: string) => {
    const record = live(id)
    const next = deviceName(name, record.kind)
    if (next === record.name) return record
    return change(normalRecord({ ...record, name: next, updated: stamp(record) }))
  }

  const remove = async (id: string, by: string) => {
    const record = records.get(id)
    if (!record || record.removed) return
    const at = Date.now()
    await commit([normalRecord({ ...record, removed: { at, by }, updated: stamp(record) })])
  }

  const merge = async (incoming: DeviceRecord[]) => {
    const changed = new Map<string, DeviceRecord>()
    for (const record of incoming) {
      if (!isSound(record)) continue
      const merged = mergeRecord(changed.get(record.id) ?? records.get(record.id), record)
      if (merged) changed.set(record.id, merged)
    }
    const list = [...changed.values()]
    await commit(list)
    return list
  }

  return {
    list: () => [...records.values()].filter(record => !record.removed),
    all: () => [...records.values()],
    get: id => records.get(id),
    byKey: publicKey => {
      const id = keys.get(publicKey)
      return id ? records.get(id) : undefined
    },
    add,
    addKey,
    rename,
    remove,
    merge,
    onChange: listener => listen(changes, listener),
    onRevoke: listener => listen(revokes, listener),
  }
}
