import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { worktreesDefaults, worktreesList, worktreesMove, worktreesRemove, worktreesRestore, worktreesSetup, worktreesThread } from './contract'
import { threadIn } from './create/thread'
import { workspaceDefaults } from './defaults'
import type { WorktreeDeps } from './deps'
import { listWorktrees } from './list/list'
import { moveThread } from './move/move'
import { removeWorktree } from './remove/remove'
import { restoreWorktree } from './remove/restore'

export const serveWorktrees = (server: Server, deps: WorktreeDeps) =>
  joinDisposers(
    server.handle(worktreesList, ({ cwd }) => listWorktrees(deps, cwd)),
    server.handle(worktreesThread, request => threadIn(deps, request)),
    server.handle(worktreesMove, request => moveThread(deps, request)),
    server.handle(worktreesRemove, request => removeWorktree(deps, request)),
    server.handle(worktreesRestore, request => restoreWorktree(deps, request)),
    server.handle(worktreesSetup, ({ path, ...request }) => deps.setups.request(path, request)),
    server.handle(worktreesDefaults, request => workspaceDefaults(deps, request)),
  )
