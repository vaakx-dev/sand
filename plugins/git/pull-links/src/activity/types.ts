import type { PullState } from '@sand/github/contract'

export type CheckState = 'pass' | 'fail' | 'pending' | 'skip'

export interface CheckResult {
  name: string
  state: CheckState
}

export type ItemKind = 'approved' | 'changes' | 'reviewed' | 'comment'

export interface PullItem {
  kind: ItemKind
  author: string
  body: string
  at: number
  path?: string
  line?: number
}

export interface OpenThread {
  path: string
  line?: number
  comments: PullItem[]
}

export interface PullActivity {
  viewer: string
  state: PullState
  head: string
  headBranch: string
  fork: boolean
  headOwner?: string
  conflict: boolean
  checks: CheckResult[]
  items: PullItem[]
  open: OpenThread[]
}
