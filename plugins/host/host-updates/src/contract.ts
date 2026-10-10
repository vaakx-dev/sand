import type { BuildChange, BuildInfo } from '@sand/protocol'

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

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'updates.state': {}
    'updates.check': {}
    'updates.later': {}
    'updates.apply': { build: string }
    'updates.restart': {}
    'updates.heard': { channel: UpdateChannel; build: string }
    'updates.channel': { channel: UpdateChannel }
    'updates.repair': {}
    'pc.repair': { device: string; resume?: boolean }
  }

  interface WireEvents {
    'updates.change': [state: UpdateState]
  }
}
