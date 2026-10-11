import type { BuildInfo, HostHealth } from '@sand/protocol'

export type { HostBundle } from '@sand/protocol'

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

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'install.create': {}
    'install.cancel': { install: string }
  }

  interface WireEvents {
    'install.progress': [progress: InstallProgress]
  }
}

declare module 'drydock' {
  interface Services {
    hostBuild: HostBuild
  }
}
