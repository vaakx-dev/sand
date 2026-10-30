import type { BuildInfo } from '@sand/host-dist/contract'
import { request, type } from '@sand/host-hub/contract'
import type { FailedPlugin, RuntimeHealth } from '@sand/host-runtimes/contract'
import { service } from 'drydock'
import { z } from 'zod'

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

export const hostHealth = service<HostHealthCheck>('hostHealth')

export const hostHealthRequest = request('host.health', { input: z.object({}), output: type<HostHealth>(), callers: 'any' })
export const pcHealth = request('pc.health', { input: z.object({ device: z.string().optional() }), output: type<HostHealth>() })
