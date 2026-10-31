export type FileKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'

export interface GitFile {
  path: string
  from?: string
  kind: FileKind
  staged: boolean
  unstaged: boolean
  add: number
  del: number
  binary?: boolean
}

export interface GitRepoLocal {
  repo: true
  root: string
  prefix: string
  main: string
  worktree: boolean
  branch?: string
  head?: string
  detached: boolean
  defaultBranch?: string
  isDefault: boolean
  files: GitFile[]
  fileCount: number
  truncated?: boolean
  add: number
  del: number
}

export type GitLocal = GitRepoLocal | { repo: false }

export interface GitRemote {
  remote?: string
  upstream?: string
  ahead: number
  behind: number
  base?: string
  behindBase: number
  aheadBase: number
  fetchedAt?: number
  fetchError?: string
}

export interface GitStatus {
  cwd: string
  local: GitLocal
  remote?: GitRemote
}

export const repoOf = (status: GitStatus | undefined): GitRepoLocal | undefined => (status?.local.repo ? status.local : undefined)

export interface GitBranch {
  name: string
  remote?: string
  current: boolean
  isDefault: boolean
  worktree?: string
  updated: number
}

export interface GitBranches {
  branches: GitBranch[]
  total: number
}
