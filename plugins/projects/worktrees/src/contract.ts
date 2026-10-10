export interface WorktreeEntry {
  path: string
  branch: string | null
  head: string
  main: boolean
  changed?: number
}

export interface WorktreeSetup {
  copy: string[]
  run: string[]
  autoSettle: boolean
}

export interface WorktreeState {
  root: string
  main: string
  name: string
  branch: string | null
  changed: number
  worktree: boolean
  worktrees: WorktreeEntry[]
  branches: string[]
  setup: WorktreeSetup
}

export interface WorktreeMark {
  branch: string | null
  main: string
}

export type StepState = 'wait' | 'run' | 'ok' | 'fail'

export interface SetupStep {
  label: string
  state: StepState
  started?: number
  ms?: number
}

export interface WorktreeProgress {
  session: string
  steps: SetupStep[]
  done: boolean
  error?: string
}

export type WorktreeIntent = { mode: 'new'; base?: string } | { mode: 'existing'; path: string }

export interface MoveRequest {
  session: string
  branch: string
  base?: string
  carry?: boolean
  setup?: boolean
}

export interface MoveResult {
  path: string
  branch: string
}

export interface RemovedEntry {
  branch: string
  path: string
  head: string
  cwd: string
  pr?: number
}

export type HoldReason = 'off' | 'local' | 'running' | 'branch' | 'changed' | 'unpushed'

export type SettleResult = { settled: true; removed: RemovedEntry } | { settled: false; reason: HoldReason; changed?: number; ahead?: number }

export const removedType = 'worktree-removed'

export const unnamedBranch = (session: string) => `sand/new-${session.replace(/[^0-9a-z]/gi, '').slice(-6).toLowerCase()}`

export const isUnnamed = (branch: string | null | undefined) => Boolean(branch && /^sand\/new-[0-9a-z]{6}$/.test(branch))

export interface RenameResult {
  later: boolean
}

export interface Worktrees {
  openMove(): void
  rename(): void
  of(cwd: string, device?: string): WorktreeMark | null | undefined
}

declare module 'drydock' {
  interface Services {
    worktrees: Worktrees
  }

  interface Events {
    'worktrees.change': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'worktrees.list': { cwd: string }
    'worktrees.of': { cwds: string[] }
    'worktrees.intend': { session: string; intent: WorktreeIntent }
    'worktrees.move': MoveRequest
    'worktrees.remove': { session: string; force?: boolean }
    'worktrees.settle': { session: string; branch?: string; pr?: number }
    'worktrees.restore': { session: string; entry: string }
    'worktrees.rename': { session: string }
  }

  interface WireEvents {
    'worktrees.progress': [progress: WorktreeProgress]
    'worktrees.change': [main: string]
  }
}
