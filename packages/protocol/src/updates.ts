import type { ReleaseInfo, UpdateChannel } from './releases'
import type { BuildInfo } from './remotes'

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
}

export interface PcRepairResult {
  device: string
  build: string
  ok: boolean
  error?: string
}
