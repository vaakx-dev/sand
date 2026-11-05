import type { ProviderCapabilities } from '@sand/accounts/contract'
import type { Selection } from '@sand/model/contract'
import type { ProviderThreadInfo, Transition } from '@sand/turns-contract/contract'

export interface Target {
  available: boolean
  caps: ProviderCapabilities
  selection: Selection
  cwd: string
  history: boolean
}

export interface Candidate {
  thread: ProviderThreadInfo
  last: boolean
  onPath: boolean
  fits: boolean
  now: number
}

const reuse: Transition = { type: 'reuse' }
const full: Transition = { type: 'handoff', strategy: 'full' }
const delta: Transition = { type: 'handoff', strategy: 'delta' }

const settings = ['effort', 'speed'] as const

const continuing = ({ caps, selection, cwd }: Target, { thread, onPath }: Candidate): Transition => {
  if (!onPath) return caps.native ? full : reuse
  if (caps.native && (thread.status === 'uncertain' || (thread.native && thread.native.cwd !== cwd))) return full
  const changed = settings.filter(key => thread[key] !== selection[key])
  if (!changed.length) return reuse
  if (changed.every(key => caps.reconfigure.includes(key))) return { type: 'reconfigure' }
  return caps.native ? { type: 'restart_and_resume' } : reuse
}

const returning = ({ caps }: Target, { thread, onPath, fits, now }: Candidate) =>
  onPath && thread.status !== 'uncertain' && now - thread.used < caps.cacheTtlMs && fits ? delta : full

export const decide = (target: Target, candidate: Candidate | undefined): Transition => {
  if (!target.available) return { type: 'reject', reason: `${target.selection.model} is not available; pick another model` }
  if (!candidate) return target.history ? full : reuse
  return candidate.last ? continuing(target, candidate) : returning(target, candidate)
}
