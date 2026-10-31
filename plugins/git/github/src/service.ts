import type { Ask } from '@sand/ask/contract'
import type { GitRepo, GitRunner } from '@sand/git/contract'
import { createClient } from './api/client'
import { githubHost } from './api/endpoint'
import { createAuth } from './auth/auth'
import { createLogin } from './auth/login'
import { logout } from './auth/logout'
import type { GitHub, GitHubAuth, GitHubLoginCode, PullRef, PullSummary } from './contract'
import { createSummaries } from './pulls/cache'
import { type CreateRequest, createPull } from './pulls/create'
import { findBranchPull } from './pulls/find'
import { type MergeRequest, mergePull } from './pulls/merge'
import { setReady } from './pulls/ready'
import { resolvePull } from './pulls/resolve'
import { createRepoInfos } from './repo/info'
import { createOrigins } from './repo/origins'
import { branchPlace } from './repo/place'
import { type TextRequest, writePullText } from './text/write'

export interface GitHubDeps {
  git: GitRunner
  repos: GitRepo
  ask(): Ask | undefined
  authChanged(auth: GitHubAuth): void
  loginCode(code: GitHubLoginCode): void
  pullChanged(summary: PullSummary): void
  pullCreated(summary: PullSummary, session?: string): void
}

export type GitHubHost = ReturnType<typeof createGitHub>

export const createGitHub = (deps: GitHubDeps) => {
  const auth = createAuth(githubHost, deps.authChanged)
  const client = createClient({
    token: auth.token,
    rejected() {
      auth.invalidate()
      void auth.auth().catch(() => undefined)
    },
  })
  const infos = createRepoInfos(client)
  const summaries = createSummaries(client, deps.pullChanged)
  const login = createLogin({ host: githubHost, auth, code: deps.loginCode })
  const place = { git: deps.git, repos: deps.repos, infos }
  const origins = createOrigins(deps.git)

  const repo = async (cwd: string) => {
    const found = await origins(cwd)
    return found ? { repo: found } : null
  }

  const forBranch = async (cwd: string) => {
    const found = await branchPlace(place, cwd)
    if (!found.ok) return null
    const ref = await findBranchPull(client, found.place)
    return ref ? summaries.get(ref) : null
  }

  const service: GitHub = {
    auth: auth.auth,
    summary: summaries.get,
    noteSummary: summaries.note,
    forBranch,
    resolve: (cwd, ref) => resolvePull(place, summaries, cwd, ref),
    graphql: client.graphql,
    rest: client.rest,
  }

  return {
    service,
    login: login.login,
    repo,
    text: (request: TextRequest) => writePullText({ git: deps.git, repos: deps.repos, ask: deps.ask }, request),
    async create(request: CreateRequest) {
      const summary = await createPull({ ...place, client }, summaries, request)
      deps.pullCreated(summary, request.session)
      return summary
    },
    logout: () => logout(githubHost, auth),
    merge: (request: MergeRequest) => mergePull(client, summaries, request),
    ready: ({ ready, ...ref }: PullRef & { ready: boolean }) => setReady(client, summaries, ref, ready),
    stop: login.stop,
  }
}
