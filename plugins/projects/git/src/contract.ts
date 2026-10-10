export interface Branches {
  of(cwd: string, device?: string): string | undefined
}

export interface GitStatus {
  branch: string
  changed: number
  ahead: number
  behind: number
  upstream?: string
  worktree: boolean
  base?: string
}

export interface GitStatuses {
  of(cwd: string, device?: string): GitStatus | undefined
  refresh(cwd: string, device?: string): void
  locals(cwd: string, device?: string): Promise<string[]>
}

declare module 'drydock' {
  interface Services {
    branches: Branches
    gitStatus: GitStatuses
  }

  interface Events {
    'branches.change': () => void
    'gitStatus.change': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'git.status': { cwd: string }
    'git.locals': { cwd: string }
  }
}
