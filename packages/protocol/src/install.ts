import type { HostHealth } from './health'

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
