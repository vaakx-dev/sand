export type SyncKind = 'snapshot' | 'history'

export type SyncMode = 'merge' | 'replace'

export type SyncRelation = 'current' | 'ahead' | 'behind' | 'both' | 'unlinked'

export type SyncResult = 'current' | 'applied' | 'merged' | 'conflicts'

export type SyncPick = 'ours' | 'theirs'

export interface SyncState {
  path: string
  exists: boolean
  git: boolean
  head: string | null
  tree: string | null
  lineage: string[]
  files: number
  bytes: number
  conflicts: string[]
  updated: number
}

export interface SyncSkipped {
  name: string
  bytes: number
}

export interface SyncInspect {
  path: string
  git: boolean
  branch?: string
  files: number
  bytes: number
  historyBytes: number
  dirty: number
  skipped: SyncSkipped[]
  secrets: string[]
  remotes: Record<string, string>
  setup?: string
  blocked?: string
}

export interface SyncExport {
  transfer: string
  size: number
  chunks: number
  commit?: string
  branch?: string
  remotes?: Record<string, string>
}

export interface SyncChunk {
  data: string
}

export interface SyncImported {
  path: string
  commit?: string
}

export interface SyncApplied {
  result: SyncResult
  head: string
  conflicts: string[]
  changed: number
}

export interface SyncResolved {
  head: string | null
  remaining: string[]
}

export interface SyncSetup {
  code: number
  output: string
}

export type SyncPhase = 'history' | 'files' | 'apply' | 'setup'

export interface SyncProgress {
  phase: SyncPhase
  sent: number
  total: number
  text: string
}
