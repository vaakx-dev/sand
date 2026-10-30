import { type DeviceSeen, devicesSeen, type Registry } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { Dispose } from 'drydock'
import type { Seen } from './seen'

const touchEvery = 60_000
const saveEvery = 5 * 60_000

const saveFailed = (error: unknown) => console.error(`devices could not save when devices were last seen: ${errorMessage(error)}`)

export const trackSeen = (hub: Hub, seen: Seen): Dispose => {
  const touching = setInterval(() => seen.touch(hub.devices()), touchEvery)
  const saving = setInterval(() => void seen.flush().catch(saveFailed), saveEvery)
  return () => {
    clearInterval(touching)
    clearInterval(saving)
    seen.touch(hub.devices())
    void seen.flush().catch(saveFailed)
  }
}

export const seenRequest = (hub: Hub, registry: Registry, seen: Seen) => () =>
  hub.handle(devicesSeen, () => {
    const online = new Set(hub.devices())
    const now = Date.now()
    return registry
      .list()
      .filter(record => record.kind !== 'pc')
      .map((record): DeviceSeen => {
        const connected = online.has(record.id)
        return { device: record.id, online: connected, at: connected ? now : (seen.at(record.id) ?? record.added) }
      })
  })
