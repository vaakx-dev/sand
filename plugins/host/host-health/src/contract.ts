import type { HostHealth } from '@sand/protocol'

export type { HostHealth } from '@sand/protocol'

export interface HostHealthCheck {
  check(): Promise<HostHealth>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'host.health': {}
    'pc.health': { device?: string }
  }
}

declare module 'drydock' {
  interface Services {
    hostHealth: HostHealthCheck
  }
}
