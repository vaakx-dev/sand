import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { githubAuth, githubLogin, githubLogout, githubRepo, pullsCreate, pullsForBranch, pullsMerge, pullsReady, pullsResolve, pullsSummary, pullsText } from './contract'
import type { GitHubHost } from './service'

export const serveGitHub = (server: Server, host: GitHubHost) =>
  joinDisposers(
    server.handle(githubAuth, () => host.service.auth()),
    server.handle(githubLogin, () => host.login()),
    server.handle(githubLogout, () => host.logout()),
    server.handle(githubRepo, ({ cwd }) => host.repo(cwd)),
    server.handle(pullsForBranch, ({ cwd }) => host.service.forBranch(cwd)),
    server.handle(pullsSummary, ({ fresh, ...ref }) => host.service.summary(ref, fresh)),
    server.handle(pullsResolve, ({ cwd, ref }) => host.service.resolve(cwd, ref)),
    server.handle(pullsText, request => host.text(request)),
    server.handle(pullsCreate, request => host.create(request)),
    server.handle(pullsMerge, request => host.merge(request)),
    server.handle(pullsReady, request => host.ready(request)),
  )
