import type { SessionInfo } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export type WorkspaceKind = 'checkout' | 'worktree'

export interface Worktree {
  path: string
  main: string
  branch?: string
  base?: string
  head?: string
  sand: boolean
  sessions: string[]
  created?: number
  removed?: number
}

export type SetupState = 'wait' | 'run' | 'ok' | 'fail' | 'skip'

export interface SetupStep {
  id: string
  label: string
  state: SetupState
  output?: string
}

export interface WorktreeSetup {
  path: string
  session?: string
  steps: SetupStep[]
  done: boolean
  failed: boolean
}

export interface WorkspaceDefaults {
  kind: WorkspaceKind
}

export interface RemoveCheck {
  running: boolean
  uncommitted: number
  unpushed: number
}

export type RemoveResult = { removed: true } | { removed: false; check: RemoveCheck; message: string }

const cwd = z.string()

export const worktreesList = request('worktrees.list', { input: z.object({ cwd }), output: type<Worktree[]>(), place: 'thread' })

export const worktreesThread = request('worktrees.thread', {
  input: z.object({ cwd, from: z.string().optional(), existing: z.string().optional() }),
  output: type<SessionInfo>(),
  place: 'thread',
})

export const worktreesMove = request('worktrees.move', {
  input: z.object({ session: z.string(), branch: z.string().optional(), carry: z.boolean() }),
  output: type<SessionInfo>(),
})

export const worktreesRemove = request('worktrees.remove', {
  input: z.object({ path: z.string(), force: z.boolean().optional() }),
  output: type<RemoveResult>(),
  place: 'thread',
})

export const worktreesRestore = request('worktrees.restore', {
  input: z.object({ path: z.string() }),
  output: type<Worktree>(),
  place: 'thread',
})

export const worktreesSetup = request('worktrees.setup', {
  input: z.object({ path: z.string(), retry: z.boolean().optional(), skip: z.boolean().optional() }),
  output: type<WorktreeSetup | null>(),
  place: 'thread',
})

export const worktreesDefaults = request('worktrees.defaults', {
  input: z.object({ cwd, set: z.object({ kind: z.enum(['checkout', 'worktree']) }).optional() }),
  output: type<WorkspaceDefaults>(),
  place: 'thread',
})

export const worktreesProgress = wireEvent<WorktreeSetup>('worktrees.progress')
export const worktreesChange = wireEvent<{ main: string }>('worktrees.change')
