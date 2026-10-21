import type { BuildInfo } from '@sand/host-dist/contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { deviceInfo, devicesList, devicesRemove, devicesRename, type DeviceInfo, type HostDevices } from './contract'

export const deviceRequests = (hub: Hub, devices: HostDevices, device: DeviceInfo, build: () => Promise<BuildInfo | undefined>): (() => Dispose)[] => [
  () => hub.handle(deviceInfo, async () => ({ ...device, build: await build().catch(() => undefined) })),
  () => hub.handle(devicesList, () => devices.list()),
  () => hub.handle(devicesRename, ({ device: id, name }) => devices.rename(id, name)),
  () => hub.handle(devicesRemove, ({ device: id }) => devices.remove(id)),
]
