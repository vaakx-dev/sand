import type { BuildInfo } from './remotes'

export type RuntimeHealth = 'starting' | 'ready' | 'failed' | 'restarting'

export interface FailedPlugin {
  id: string
  error: string
}

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
