import { devicesList, devicesRemove, devicesRename, devicesSync, pcRename } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { HostRegistry } from './registry'
import type { HostThisPc } from './this-pc'

export const deviceRequests = (hub: Hub, registry: HostRegistry, thisPc: HostThisPc): (() => Dispose)[] => [
  () => hub.handle(devicesList, () => registry.list()),
  () =>
    hub.handle(devicesRename, async ({ device, name }, caller) => {
      if (device === thisPc.id) await thisPc.rename(name)
      else await registry.rename(device, name, caller.device)
      return registry.get(device)!
    }),
  () =>
    hub.handle(devicesRemove, ({ device }, caller) => {
      if (device === thisPc.id) throw new Error("This PC can't remove itself; remove it from another of your PCs")
      return registry.remove(device, caller.device)
    }),
  () =>
    hub.handle(devicesSync, async ({ records }) => {
      await registry.merge(records)
      return registry.all()
    }),
  () => hub.handle(pcRename, ({ name }) => thisPc.rename(name)),
]
