import type { GitRunner } from '@sand/git-runner/contract'
import type { Rest } from './api/client'
import type { Pull, PullState } from './contract'
import { repoOf } from './repo'

interface Listed {
  number: number
  title: string
  state: 'open' | 'closed'
  draft: boolean
  merged_at: string | null
  html_url: string
}

export type PullGit = Pick<GitRunner, 'remoteUrl' | 'maybe' | 'ok'>

const read = { read: true }

const pushMs = 120_000

const stateOf = ({ state, draft, merged_at }: Listed): PullState => {
  if (merged_at) return 'merged'
  if (state === 'closed') return 'closed'
  return draft ? 'draft' : 'open'
}

const pullOf = (pull: Listed): Pull => ({ number: pull.number, title: pull.title, state: stateOf(pull), url: pull.html_url })

const branchOnGitHub = async (git: PullGit, cwd: string) => {
  const [repo, branch] = await Promise.all([repoOf(git, cwd), git.maybe(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'], read)])
  if (!repo || !branch) return undefined
  return { ...repo, branch }
}

export const pullsOf = async (git: PullGit, client: Rest, cwd: string): Promise<Pull[] | null> => {
  const found = await branchOnGitHub(git, cwd)
  if (!found) return null
  const head = encodeURIComponent(`${found.owner}:${found.branch}`)
  const listed = await client.rest<Listed[]>('GET', `${found.path}/pulls?head=${head}&state=all&per_page=10`)
  return listed.map(pullOf)
}

const pushIfNeeded = async (git: PullGit, cwd: string, branch: string) => {
  if ((await git.maybe(cwd, ['rev-list', '--count', '@{upstream}..HEAD'], read)) === '0') return
  await git.ok(cwd, ['push', '--quiet', '--set-upstream', 'origin', branch], { timeoutMs: pushMs, what: "Couldn't push the branch" })
}

export const openPull = async (git: PullGit, client: Rest, cwd: string, title: string): Promise<Pull> => {
  const found = await branchOnGitHub(git, cwd)
  if (!found) throw new Error("This folder isn't on a branch of a GitHub repo.")
  await pushIfNeeded(git, cwd, found.branch)
  const { default_branch: base } = await client.rest<{ default_branch: string }>('GET', found.path)
  return pullOf(await client.rest<Listed>('POST', `${found.path}/pulls`, { title, head: found.branch, base }))
}
