import type { GitRunner } from '@sand/git-runner/contract'
import { githubHost } from './api/endpoint'
import type { Client } from './api/client'
import type { Pull, PullState } from './contract'

interface Listed {
  number: number
  title: string
  state: 'open' | 'closed'
  draft: boolean
  merged_at: string | null
  html_url: string
}

const repoPattern = new RegExp(`${githubHost.replace('.', '\\.')}[:/]([^/]+)/([^/]+?)(?:\\.git)?/?$`)

const stateOf = ({ state, draft, merged_at }: Listed): PullState => {
  if (merged_at) return 'merged'
  if (state === 'closed') return 'closed'
  return draft ? 'draft' : 'open'
}

export const pullsOf = async (git: Pick<GitRunner, 'remoteUrl' | 'maybe'>, client: Client, cwd: string): Promise<Pull[]> => {
  const [remote, branch] = await Promise.all([git.remoteUrl(cwd), git.maybe(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { read: true })])
  const match = remote && repoPattern.exec(remote)
  if (!match || !branch) return []
  const [, owner, repo] = match
  const head = encodeURIComponent(`${owner}:${branch}`)
  const listed = await client.rest<Listed[]>('GET', `/repos/${owner}/${repo}/pulls?head=${head}&state=all&per_page=10`)
  return listed.map(pull => ({ number: pull.number, title: pull.title, state: stateOf(pull), url: pull.html_url }))
}
