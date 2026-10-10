export type PrState = 'open' | 'merged' | 'closed'

export interface PrSummary {
  number: number
  title: string
  url: string
  state: PrState
  draft: boolean
  branch: string
  base: string
  checks: { passed: number; failed: number; pending: number }
  failing: string[]
  unresolved: number
  mergeState: string
  review: string
}

export interface Pulls {
  of(cwd: string, device?: string): PrSummary | null | undefined
  refresh(cwd: string, device?: string): void
}

declare module 'drydock' {
  interface Services {
    pulls: Pulls
  }

  interface Events {
    'pulls.change': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'github.pr': { cwd: string }
  }
}
