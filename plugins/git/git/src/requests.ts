import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { gitBranches, gitStatus, gitWatch } from './contract'
import type { GitRepoHost } from './repo'

export const serveGit = (server: Server, { repo, watch }: GitRepoHost) =>
  joinDisposers(
    server.handle(gitStatus, ({ cwd }) => repo.status(cwd)),
    server.handle(gitWatch, ({ cwd }) => watch(cwd)),
    server.handle(gitBranches, ({ cwd, query, limit }) => repo.branches(cwd, query, limit)),
  )
