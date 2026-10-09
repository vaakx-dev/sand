import type { BuildInfo, DeviceInfo, HostDevices, Hub } from '@sand/protocol'
import type { Dispose } from 'drydock'

export const deviceRequests = (hub: Hub, devices: HostDevices, device: DeviceInfo, build: () => Promise<BuildInfo | undefined>): (() => Dispose)[] => [
  () => hub.handle('device.info', async () => ({ ...device, build: await build().catch(() => undefined) })),
  () => hub.handle('devices.list', () => devices.list()),
  () => hub.handle('devices.rename', ({ device: id, name }) => devices.rename(id, name)),
  () => hub.handle('devices.remove', ({ device: id }) => devices.remove(id)),
]
