import type { Session, SessionInfo } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export { unsaved } from './status/unsaved'

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
  kind?: WorkspaceKind
}

export interface GlobalDefault {
  kind: WorkspaceKind
}

export interface RemoveCheck {
  running: boolean
  uncommitted: number
  unpushed: number
}

export type RemoveResult = { removed: true } | { removed: false; check: RemoveCheck; message: string }

export interface WorktreeStatus {
  path: string
  main: string
  branch?: string
  base?: string
  ahead?: number
  check: RemoveCheck
}

const cwd = lazy(() => z.string())
const kind = lazy(() => z.enum(['checkout', 'worktree']))

export const worktreesList = request('worktrees.list', { input: () => z.object({ cwd: cwd() }), output: type<Worktree[]>(), place: 'thread' })

export interface WorktreeThreadInput {
  cwd: string
  branch?: string
  from?: string
  open?: (cwd: string, project: string | null) => Session
}

export interface Worktrees {
  thread(input: WorktreeThreadInput): Promise<SessionInfo>
  move(session: string, branch?: string): Promise<void>
}

export const worktrees = service<Worktrees>('worktrees')

export const worktreesRemove = request('worktrees.remove', {
  input: () => z.object({ path: z.string(), force: z.boolean().optional() }),
  output: type<RemoveResult>(),
  place: 'thread',
})

export const worktreesRestore = request('worktrees.restore', {
  input: () => z.object({ path: z.string() }),
  output: type<Worktree>(),
  place: 'thread',
})

export const worktreesSetup = request('worktrees.setup', {
  input: () => z.object({ path: z.string(), retry: z.boolean().optional(), skip: z.boolean().optional() }),
  output: type<WorktreeSetup | null>(),
  place: 'thread',
})

export const worktreesDefaults = request('worktrees.defaults', {
  input: () => z.object({ cwd: cwd(), set: z.object({ kind: kind() }).optional() }),
  output: type<WorkspaceDefaults>(),
  place: 'thread',
})

export const worktreesGlobal = request('worktrees.global', {
  input: () => z.object({ set: z.object({ kind: kind() }).optional() }),
  output: type<GlobalDefault>(),
})

export const worktreesStatus = request('worktrees.status', { input: () => z.object({}), output: type<WorktreeStatus[]>(), place: 'thread' })

export const worktreesSizes = request('worktrees.sizes', { input: () => z.object({}), output: type<Record<string, number>>(), place: 'thread' })

export interface SetupLines {
  copy: string[]
  run: string[]
}

export const setupAnswers = ['save', 'decline'] as const

export type SetupAnswer = (typeof setupAnswers)[number]

export interface SetupProposal {
  path: string
  session?: string
  lines: SetupLines | null
}

export const worktreesProposal = request('worktrees.proposal', {
  input: () => z.object({ path: z.string(), answer: z.enum(setupAnswers).optional() }),
  output: type<SetupLines | null>(),
  place: 'thread',
})

export const worktreesProposed = wireEvent<SetupProposal>('worktrees.proposed')

export const worktreesProgress = wireEvent<WorktreeSetup>('worktrees.progress')
export const worktreesChange = wireEvent<{ main: string }>('worktrees.change')

