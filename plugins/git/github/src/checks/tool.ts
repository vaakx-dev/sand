import type { GitRunner } from '@sand/git-runner/contract'
import type { Tool } from '@sand/tools/contract'
import { shortSha } from '@sand/util'
import { z } from 'zod'
import type { Client } from '../api/client'
import { repoOf } from '../repo'
import { readChecks } from './read'
import type { Listen } from './user'
import { type Timing, waitChecks } from './wait'

const defaultTimeout = 1_200_000
const maxTimeout = 3_600_000
const settleGrace = 60_000

const input = z.object({
  pr: z.number().int().positive().optional().describe("Pull request number (default: the commit this folder's branch last pushed)"),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up waiting after this long (default ${defaultTimeout}, max ${maxTimeout})`),
})

export type ChecksGit = Pick<GitRunner, 'remoteUrl' | 'maybe'>

export interface ChecksDeps {
  git: ChecksGit
  client: Client
  listen: Listen
  timing: Timing
}

const commitOf = async ({ git, client }: ChecksDeps, cwd: string, repo: string, pr: number | undefined) => {
  if (pr !== undefined) return (await client.rest<{ head: { sha: string } }>('GET', `${repo}/pulls/${pr}`)).head.sha
  const pushed = await git.maybe(cwd, ['rev-parse', '--verify', '--quiet', '@{upstream}'], { read: true })
  if (!pushed) throw new Error("This folder's branch has no upstream; push it, or pass a PR number.")
  return pushed
}

export const checksTool = (deps: ChecksDeps): Tool<typeof input> => ({
  name: 'pr_checks',
  description: [
    "Wait for a pull request's CI checks (the check runs and commit statuses on its head commit) and get the result.",
    'Returns as soon as one fails, with the failing checks and their links, and at once if they already finished.',
    'Also returns on timeout or when the user sends a message.',
    'Use this instead of sleep and gh pr checks.',
  ].join(' '),
  input,
  effect: 'read',
  needs: ['folder'],
  timeoutMs: maxTimeout + settleGrace,
  async run({ pr, timeout_ms = defaultTimeout }, { cwd, conversation, signal, progress }) {
    const repo = await repoOf(deps.git, cwd)
    if (!repo) throw new Error("This folder isn't in a GitHub repo.")
    const sha = await commitOf(deps, cwd, repo.path, pr)
    const spoke = deps.listen(conversation.id)
    try {
      const read = () => readChecks(deps.client, repo.path, sha)
      return `Checks on ${shortSha(sha)}: ${await waitChecks({ read, progress, signal, spoke: spoke.signal, timeoutMs: timeout_ms, timing: deps.timing })}`
    } finally {
      spoke.stop()
    }
  },
})
