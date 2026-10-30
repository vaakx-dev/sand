import type { HostHealth } from '@sand/host-health/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type InstallPlatform = 'linux' | 'darwin' | 'win32'

export type InstallStep = 'connected' | 'sand' | 'plugins' | 'pairing' | 'checking' | 'sharing' | 'ready' | 'failed'

export type InstallStage = 'installing' | 'joining' | 'sharing' | 'ready' | 'failed'

export interface InstallGrant {
  id: string
  command: string
  expires: number
}

export interface InstallProgress {
  install: string
  step: InstallStep
  stage: InstallStage
  at: number
  expires: number
  name?: string
  pc?: string
  plugins?: number
  accounts?: string[]
  error?: string
  health?: HostHealth
}

export interface InstallDone {
  accounts: string[]
}

export const installJoinEnv = 'SAND_JOIN'

export const installPaths = {
  plugins: '/install/plugins',
  step: '/install/step',
  done: '/install/done',
  fail: '/install/fail',
} as const

export const installParams = {
  token: 'token',
  step: 'step',
} as const

export const installCreate = request('install.create', {
  input: z.object({
    platform: z.enum(['linux', 'darwin', 'win32']),
    route: z.string().min(1),
    channel: z.enum(['release', 'nightly', 'dev']).optional(),
  }),
  output: type<InstallGrant>(),
})
export const installCancel = request('install.cancel', { input: z.object({ id: z.string().min(1) }), output: type<void>() })
export const installList = request('install.list', { input: z.object({}), output: type<InstallProgress[]>() })

export const installProgress = wireEvent<InstallProgress>('install.progress')
