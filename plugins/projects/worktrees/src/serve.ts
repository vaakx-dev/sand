import type { Server } from '@sand/server/contract'
import type { Ops } from './ops/context'
import type { Intents } from './ops/intents'
import { listState } from './ops/list'
import { marksOf } from './ops/marks'
import { moveSession } from './ops/move'
import type { Naming } from './ops/naming'
import { removeSessionWorktree, removeWorktreeAt } from './ops/remove'
import { restoreSession } from './ops/restore'

const prOf = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined)

export const serveWorktrees = (server: Server, ops: Ops, intents: Intents, naming: Naming) =>
  server.handle({
    'worktrees.list': ({ cwd }) => listState(ops, String(cwd ?? '')),
    'worktrees.of': ({ cwds }) => marksOf(cwds),
    'worktrees.intend': ({ session, intent }) => intents.intend(session, intent),
    'worktrees.move': request => moveSession(ops, request),
    'worktrees.remove': ({ session, force }) => removeSessionWorktree(ops, session, { force: force === true }),
    'worktrees.settle': ({ session, branch, pr }) =>
      removeSessionWorktree(ops, session, { auto: true, branch: typeof branch === 'string' ? branch : undefined, pr: prOf(pr) }),
    'worktrees.restore': ({ session, entry }) => restoreSession(ops, session, entry),
    'worktrees.rename': ({ session }) => naming.rename(session),
    'worktrees.name': ({ path, name }) => naming.nameAt(path, name),
    'worktrees.drop': ({ path }) => removeWorktreeAt(ops, path),
  })
