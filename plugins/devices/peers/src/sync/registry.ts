import { type DeviceRecord, devicesSync, isPcUnavailable, type Peers, type Registry } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import type { Dispose } from 'drydock'

export const registrySync = (peers: Peers, registry: Registry): (() => Dispose)[] => {
  const exchange = (pc: string, records: DeviceRecord[]) =>
    void peers
      .call(pc, devicesSync, { records })
      .then(theirs => registry.merge(theirs))
      .catch((error: unknown) => {
        if (!isPcUnavailable(error)) console.error(`couldn't share the device list with ${peers.get(pc)?.name ?? pc}: ${errorMessage(error)}`)
      })

  return [
    () => peers.onOpen(pc => exchange(pc, registry.all())),
    () =>
      registry.onChange(changed => {
        for (const pc of peers.connected()) exchange(pc, changed)
      }),
  ]
}
