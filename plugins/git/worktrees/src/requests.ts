import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import {
  worktreesDefaults,
  worktreesGlobal,
  worktreesList,
  worktreesProposal,
  worktreesRemove,
  worktreesRestore,
  worktreesSetup,
  worktreesSizes,
  worktreesStatus,
} from './contract'
import { globalDefault, workspaceDefaults } from './defaults'
import type { WorktreeDeps } from './deps'
import { listWorktrees } from './list/list'
import { removeWorktree } from './remove/remove'
import { restoreWorktree } from './remove/restore'
import type { Survey } from './status/survey'

export const serveWorktrees = (server: Server, deps: WorktreeDeps, survey: Survey) =>
  joinDisposers(
    server.handle(worktreesList, ({ cwd }) => listWorktrees(deps, cwd)),
    server.handle(worktreesRemove, request => removeWorktree(deps, request)),
    server.handle(worktreesRestore, request => restoreWorktree(deps, request)),
    server.handle(worktreesSetup, ({ path, ...request }) => deps.setups.request(path, request)),
    server.handle(worktreesProposal, ({ path, answer }) => deps.proposals.request(path, answer)),
    server.handle(worktreesDefaults, request => workspaceDefaults(deps, request)),
    server.handle(worktreesGlobal, ({ set }) => globalDefault(deps, set)),
    server.handle(worktreesStatus, () => survey.status()),
    server.handle(worktreesSizes, () => survey.sizes()),
  )
