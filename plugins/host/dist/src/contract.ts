import type { HostHealth } from '@sand/host-health/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

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

export interface HostBundle {
  build: BuildInfo
  bytes: Uint8Array<ArrayBuffer>
}

export interface HostBuild {
  info(): Promise<BuildInfo>
}

export type InstallStep = 'connected' | 'sand' | 'plugins' | 'pairing' | 'checking' | 'sharing' | 'ready' | 'failed'

export type InstallStage = 'installing' | 'joining' | 'sharing' | 'ready' | 'failed'

export interface InstallTicket {
  id: string
  secret: string
  expires: number
}

export interface InstallProgress {
  install: string
  step: InstallStep
  stage: InstallStage
  at: number
  name?: string
  plugins?: number
  accounts?: string[]
  error?: string
  health?: HostHealth
}

export interface InstallPairRequest {
  name: string
  links: string[]
}

export interface InstallPairResult {
  id: string
  name: string
}

export interface InstallDoneRequest {
  accounts: string[]
}

export const hostBuild = service<HostBuild>('hostBuild')

export const installCreate = request('install.create', { input: z.object({}), output: type<InstallTicket>() })
export const installCancel = request('install.cancel', { input: z.object({ install: z.string() }), output: type<void>() })

export const installProgress = wireEvent<InstallProgress>('install.progress')
