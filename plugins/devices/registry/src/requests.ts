import { devicesIcon, devicesList, devicesRemove, devicesRename, devicesSync, type Peers } from '@sand/devices-contract'
import type { Caller, Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { HostRegistry } from './registry'

interface DeviceRequests {
  hub: Pick<Hub, 'handle'>
  registry: HostRegistry
  here: string
  linked: () => Pick<Peers, 'connected' | 'call'> | undefined
}

export const deviceRequests = ({ hub, registry, here, linked }: DeviceRequests): (() => Dispose)[] => {
  const owner = (device: string) => {
    const found = linked()
    return found?.connected().includes(device) ? found : undefined
  }

  const rename = (device: string, name: string, caller: Caller) => {
    const remote = caller.kind === 'pc' ? undefined : owner(device)
    return remote ? remote.call(device, devicesRename, { device, name }) : registry.rename(device, name, caller.device)
  }

  return [
    () => hub.handle(devicesList, () => registry.list()),
    () => hub.handle(devicesRename, ({ device, name }, caller) => rename(device, name, caller)),
    () => hub.handle(devicesIcon, ({ device, icon }) => registry.setIcon(device, icon)),
    () =>
      hub.handle(devicesRemove, ({ device }, caller) => {
        if (device === here) throw new Error("This PC can't remove itself; remove it from another of your PCs")
        return registry.remove(device, caller.device)
      }),
    () =>
      hub.handle(devicesSync, async ({ records }) => {
        await registry.merge(records)
        return registry.all()
      }),
  ]
}
