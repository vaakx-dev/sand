import type { Server } from '@sand/server/contract'
import { listState } from './ops/list'
import { marksOf } from './ops/marks'
import { moveSession } from './ops/move'
import { removeSessionWorktree } from './ops/remove'
import { restoreSession } from './ops/restore'
import type { Intents } from './ops/intents'
import type { Naming } from './ops/naming'
import type { Ops } from './ops/types'

const prOf = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined)

export const serveWorktrees = (server: Server, ops: Ops, intents: Intents, naming: Naming) => {
  const disposers = [
    server.handle('worktrees.list', ({ cwd }) => listState(ops, String(cwd ?? ''))),
    server.handle('worktrees.of', ({ cwds }) => marksOf(cwds)),
    server.handle('worktrees.intend', ({ session, intent }) => intents.intend(session, intent)),
    server.handle('worktrees.move', request => moveSession(ops, request)),
    server.handle('worktrees.remove', ({ session, force }) => removeSessionWorktree(ops, session, { force: force === true })),
    server.handle('worktrees.settle', ({ session, branch, pr }) =>
      removeSessionWorktree(ops, session, { auto: true, branch: typeof branch === 'string' ? branch : undefined, pr: prOf(pr) }),
    ),
    server.handle('worktrees.restore', ({ session, entry }) => restoreSession(ops, session, entry)),
    server.handle('worktrees.rename', ({ session }) => naming.rename(session)),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
