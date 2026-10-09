import type { BuildInfo, FailedPlugin, RuntimeHealth } from '@sand/protocol'

export interface HostHealth {
  healthy: boolean
  runtime: RuntimeHealth
  error?: string
  failedPlugins: FailedPlugin[]
  web: boolean
  webError?: string
  build?: BuildInfo
  log: string[]
}

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
