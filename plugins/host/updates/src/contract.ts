import type { BuildChange, BuildInfo } from '@sand/host-dist/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type UpdateChannel = 'release' | 'nightly' | 'dev'

export interface ReleaseInfo {
  channel: UpdateChannel
  tag: string
  name: string
  publishedAt: number
  notesUrl: string
  build: BuildInfo
  changes?: BuildChange[]
}

export type UpdatePhase = 'idle' | 'downloading' | 'installing' | 'switching' | 'waiting' | 'restarting' | 'failed'

export interface UpdateState {
  installed: boolean
  channel: UpdateChannel
  current?: BuildInfo
  latest?: ReleaseInfo
  available: boolean
  later: boolean
  checking: boolean
  checkedAt?: number
  checkError?: string
  phase: UpdatePhase
  error?: string
  running?: number
}

export interface PcRepairResult {
  device: string
  build: string
  ok: boolean
  error?: string
}

const channel = z.enum(['release', 'nightly', 'dev'] satisfies UpdateChannel[])
const build = z.string().min(1)
const none = z.object({})

export const updatesState = request('updates.state', { input: none, output: type<UpdateState>() })
export const updatesCheck = request('updates.check', { input: none, output: type<UpdateState>() })
export const updatesLater = request('updates.later', { input: none, output: type<UpdateState>() })
export const updatesApply = request('updates.apply', { input: z.object({ build }), output: type<UpdateState>() })
export const updatesRestart = request('updates.restart', { input: none, output: type<UpdateState>() })
export const updatesHeard = request('updates.heard', { input: z.object({ channel, build }), output: type<UpdateState>() })
export const updatesChannel = request('updates.channel', { input: z.object({ channel }), output: type<UpdateState>() })
export const updatesRepair = request('updates.repair', { input: none, output: type<UpdateState & { target: BuildInfo }>() })
export const pcRepair = request('pc.repair', { input: z.object({ device: z.string().min(1), resume: z.boolean().optional() }), output: type<PcRepairResult>() })

export const updatesChange = wireEvent<UpdateState>('updates.change')
