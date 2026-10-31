import type { Sessions } from '@sand/chats/contract'
import type { GitRepo, GitRunner } from '@sand/git/contract'
import type { GitHub } from '@sand/github/contract'
import type { Worktrees } from '@sand/worktrees/contract'
import type { PullOpenRequest } from '../contract'
import type { ThreadLinks } from '../links/links'
import { openInCheckout } from './checkout'
import { openInWorktree } from './worktree'

export interface OpenDeps {
  github: GitHub
  git: GitRunner
  repos: GitRepo
  sessions: Sessions
  links: ThreadLinks
  worktrees(): Worktrees | undefined
  queue<T>(main: string, task: () => Promise<T>): Promise<T>
}

export const openPull = async (deps: OpenDeps, { cwd, ref, mode }: PullOpenRequest) => {
  const pull = await deps.github.resolve(cwd, ref)
  const local = await deps.repos.local(cwd)
  if (!local.repo) throw new Error(`${cwd} isn't inside a git repository.`)
  const session = await deps.queue(local.main, async () =>
    mode === 'worktree' ? openInWorktree(deps, local.main, pull) : (await openInCheckout(deps, local.main, pull)).id,
  )
  await deps.links.link(session, pull, 'opened')
  return { session }
}
