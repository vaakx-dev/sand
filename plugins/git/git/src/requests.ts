import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { commitFolder } from './actions/commit'
import { discardFolder } from './actions/discard'
import { pushBranch } from './actions/push'
import { updateFromDefault } from './actions/update'
import { gitBranches, gitCommit, gitDiscard, gitPush, gitStatus, gitUpdate, gitWatch } from './contract'
import type { GitRepoHost } from './repo'

export const serveGit = (server: Server, { repo, watch }: GitRepoHost) => {
  const thenRefresh = async <T>(cwd: string, action: Promise<T>) => {
    try {
      return await action
    } finally {
      await repo.refresh(cwd)
    }
  }
  return joinDisposers(
    server.handle(gitStatus, ({ cwd }) => repo.status(cwd)),
    server.handle(gitWatch, ({ cwd }) => watch(cwd)),
    server.handle(gitBranches, ({ cwd, query, limit }) => repo.branches(cwd, query, limit)),
    server.handle(gitCommit, ({ cwd, message }) => thenRefresh(cwd, commitFolder(cwd, message))),
    server.handle(gitPush, ({ cwd }) => thenRefresh(cwd, pushBranch(cwd))),
    server.handle(gitUpdate, ({ cwd }) => thenRefresh(cwd, repo.defaultBranch(cwd).then(branch => updateFromDefault(cwd, branch)))),
    server.handle(gitDiscard, ({ cwd }) => thenRefresh(cwd, discardFolder(cwd))),
  )
}
