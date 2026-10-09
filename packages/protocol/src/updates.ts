import type { BuildInfo } from './remotes'

export type UpdatePhase = 'idle' | 'downloading' | 'installing' | 'switching' | 'waiting' | 'restarting' | 'failed'

export interface UpdateOffer {
  source: string
  name: string
  build: BuildInfo
}

export interface UpdateState {
  installed: boolean
  current?: BuildInfo
  offer?: UpdateOffer
  later: boolean
  phase: UpdatePhase
  error?: string
}

export interface PcRepairResult {
  device: string
  build: string
  ok: boolean
  error?: string
}
