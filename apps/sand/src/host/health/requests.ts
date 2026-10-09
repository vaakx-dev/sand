import type { HostHealth, Hub } from '@sand/protocol'
import type { Dispose } from 'drydock'

export interface HealthRequestOptions {
  self: string
  local(): Promise<HostHealth>
  peer(device: string): Promise<HostHealth>
}

export const healthRequests = (hub: Hub, options: HealthRequestOptions): (() => Dispose)[] => [
  () => hub.handle('host.health', () => options.local()),
  () =>
    hub.handle('pc.health', ({ device }) => {
      if (device !== undefined && typeof device !== 'string') throw new Error('pc.health needs a device id')
      if (!device || device === options.self) return options.local()
      return options.peer(device)
    }),
]
