import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { hostHealthRequest, pcHealth, type HostHealth } from './contract'

interface HealthRequestOptions {
  self: string
  local(): Promise<HostHealth>
  peer(device: string): Promise<HostHealth>
}

export const healthRequests = (hub: Hub, options: HealthRequestOptions): (() => Dispose)[] => [
  () => hub.handle(hostHealthRequest, () => options.local()),
  () =>
    hub.handle(pcHealth, ({ device }) => {
      if (!device || device === options.self) return options.local()
      return options.peer(device)
    }),
]
