import { directRoute, viaRoute } from '@sand/devices-connect'
import type { DeviceRecord, Route } from '@sand/devices-contract'

const originRoutes = (record: DeviceRecord) =>
  record.keys.flatMap(key => (key.origin ? [directRoute(key.origin, 'seed')] : [])).filter(route => route !== undefined)

export const seedsFor = (record: DeviceRecord, pcs: DeviceRecord[]): Route[] => [
  ...originRoutes(record),
  ...pcs.filter(other => other.id !== record.id).map(other => viaRoute(other.id)),
]

export const pinnedKey = (record: DeviceRecord) => record.keys[0]?.publicKey
