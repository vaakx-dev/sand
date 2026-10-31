import { type Dispose, service } from 'drydock'
import type { GitBranches, GitLocal, GitStatus } from './status'

export interface GitBase {
  branch: string
  ref: string
  label: string
  commit: string
}

export interface GitLayout {
  root: string
  prefix: string
  gitDir: string
  commonDir: string
  main: string
  worktree: boolean
}

export interface GitWorktree {
  path: string
  head?: string
  branch?: string
  bare: boolean
}

export interface GitRepo {
  status(cwd: string): Promise<GitStatus>
  local(cwd: string): Promise<GitLocal>
  layout(cwd: string): Promise<GitLayout | undefined>
  worktrees(cwd: string): Promise<GitWorktree[]>
  branches(cwd: string, query?: string, limit?: number): Promise<GitBranches>
  defaultBranch(cwd: string): Promise<string | undefined>
  base(cwd: string): Promise<GitBase | undefined>
  refresh(cwd: string): Promise<void>
  fetch(cwd: string): Promise<void>
  watchLocal(cwd: string, listener: (local: GitLocal) => void): Dispose
}

export const gitRepo = service<GitRepo>('gitRepo')
