import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type OrrinStep = 'downloading' | 'verifying' | 'unpacking' | 'stopping' | 'starting'

export interface OrrinRunning {
  version: string
  port: number
  projects: number
}

export interface OrrinSetup {
  installed?: { path: string; version: string }
  running?: OrrinRunning
  latest?: string
  updateAvailable: boolean
  restartNeeded: boolean
  task?: { step: OrrinStep; percent?: number }
  error?: string
}

export const orrinSetupGet = request('orrin.setup.get', { input: z.object({}), output: type<OrrinSetup>() })
export const orrinInstall = request('orrin.install', { input: z.object({}), output: type<OrrinSetup>() })
export const orrinStart = request('orrin.start', { input: z.object({}), output: type<OrrinSetup>() })
export const orrinRestart = request('orrin.restart', { input: z.object({}), output: type<OrrinSetup>() })

export const orrinSetupChange = wireEvent<OrrinSetup>('orrin.setup.change')
