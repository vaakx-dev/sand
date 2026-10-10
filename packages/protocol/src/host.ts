import type { FailedPlugin } from './runtime'

export interface BuildInfo {
  id: string
  time: number
  commit?: string
}

export interface BuildChange {
  commit: string
  type: string
  scope?: string
  summary: string
}

export interface DeviceInfo {
  id: string
  name: string
  platform: string
  build?: BuildInfo
}

export interface HostOptions {
  home: string
  main: string
  port: number
  watch: boolean
  drainTimeout: number
  device: DeviceInfo
}

export interface HostApp {
  root(): string
  main(): string
  use(root: string): void
}

export type RuntimeHealth = 'starting' | 'ready' | 'failed' | 'restarting'

export interface HostStatus {
  pid: number
  runtime: RuntimeHealth
  error?: string
  failed?: FailedPlugin[]
  draining: number
}

declare module 'drydock' {
  interface Services {
    hostOptions: HostOptions
    hostApp: HostApp
  }

  interface Events {
    'host.stop': () => void
    'host.restart': () => void
  }
}
