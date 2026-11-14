import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import type { BuildChange, BuildInfo } from '@sand/util/release'
import { service } from 'drydock'
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
  notices: HomeNotice[]
  running?: number
}

export interface HomeNotice {
  id: string
  title: string
  detail: string
}

export interface AddonTarget {
  addons?: Record<string, string>
  catalog?: string
}

export interface StagedAddons {
  place(): Promise<string[]>
  drop(): Promise<void>
}

export interface BuildAddons {
  stage(target: AddonTarget): Promise<StagedAddons>
}

export interface PcRepairResult {
  device: string
  build: string
  ok: boolean
  error?: string
}

const channel = lazy(() => z.enum(['release', 'nightly', 'dev'] satisfies UpdateChannel[]))
const build = lazy(() => z.string().min(1))
const onPc = lazy(() => z.object({ pc: z.string().min(1).optional() }))

export const updatesState = request('updates.state', { input: onPc, output: type<UpdateState>(), callers: 'any' })
export const updatesCheck = request('updates.check', { input: onPc, output: type<UpdateState>(), callers: 'any' })
export const updatesLater = request('updates.later', { input: onPc, output: type<UpdateState>(), callers: 'any' })
export const updatesApply = request('updates.apply', { input: () => onPc().extend({ build: build() }), output: type<UpdateState>(), callers: 'any' })
export const updatesRestart = request('updates.restart', { input: onPc, output: type<UpdateState>(), callers: 'any' })
export const updatesHeard = request('updates.heard', { input: () => z.object({ channel: channel(), build: build() }), output: type<UpdateState>(), callers: 'pc' })
export const updatesChannel = request('updates.channel', { input: () => onPc().extend({ channel: channel() }), output: type<UpdateState>(), callers: 'any' })
export const updatesRepair = request('updates.repair', { input: () => z.object({}), output: type<UpdateState & { target: BuildInfo }>(), callers: 'pc' })
export const updatesDismiss = request('updates.dismiss', { input: () => onPc().extend({ id: z.string().min(1) }), output: type<UpdateState>(), callers: 'any' })
export const pcRepair = request('pc.repair', { input: () => z.object({ device: z.string().min(1), resume: z.boolean().optional() }), output: type<PcRepairResult>() })

export const updatesChange = wireEvent<UpdateState>('updates.change')

export const buildAddons = service<BuildAddons>('buildAddons')
