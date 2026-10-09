import type { Session } from '@sand/sessions-sqlite/contract'

export interface TrialCheck {
  name: string
  ok: boolean
  detail?: string
}

export interface TrialReport {
  ok: boolean
  plugin: string
  loops: string[]
  checks: TrialCheck[]
  session?: string
  applied: boolean
  error?: string
}

export interface TrialOptions {
  apply?: boolean
  parent?: Session
}

export interface LoopTrial {
  run(plugin: string, options?: TrialOptions): Promise<TrialReport>
}

declare module 'drydock' {
  interface Services {
    loopTrial: LoopTrial
  }
}
