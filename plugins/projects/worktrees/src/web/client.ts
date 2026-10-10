import type { MoveRequest, MoveResult, SettleResult, WorktreeIntent, WorktreeMark, WorktreeState } from '../contract'
import type { Context } from 'drydock'

export type WebContext = Context<'threads' | 'wire'>

export const worktreeClient = ({ wire }: WebContext) => ({
  list: (cwd: string, device?: string) => wire.call<WorktreeState | null>({ type: 'worktrees.list', cwd }, device),
  marks: (cwds: string[], device?: string) => wire.call<Record<string, WorktreeMark | null>>({ type: 'worktrees.of', cwds }, device),
  intend: (session: string, intent: WorktreeIntent) => wire.call<void>({ type: 'worktrees.intend', session, intent }),
  move: (request: MoveRequest) => wire.call<MoveResult>({ type: 'worktrees.move', ...request }),
  remove: (session: string, force: boolean) => wire.call<SettleResult>({ type: 'worktrees.remove', session, force }),
  settle: (session: string, branch: string, pr?: number) => wire.call<SettleResult>({ type: 'worktrees.settle', session, branch, ...(pr && { pr }) }),
  restore: (session: string, entry: string) => wire.call<MoveResult>({ type: 'worktrees.restore', session, entry }),
})

export type WorktreeClient = ReturnType<typeof worktreeClient>
