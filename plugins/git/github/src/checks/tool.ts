import type { GitRunner } from '@sand/git-runner/contract'
import type { Tool } from '@sand/tools/contract'
import { shortSha } from '@sand/util'
import { z } from 'zod'
import type { Rest } from '../api/client'
import { pullReference, repoOf } from '../repo'
import { type CheckOutcome, readChecks } from './read'
import type { Listen } from './user'
import { type Timing, waitChecks } from './wait'

const defaultTimeout = 1_200_000
const maxTimeout = 3_600_000
const settleGrace = 60_000

const input = z.object({
  pr: z
    .union([z.number().int().positive(), z.string()])
    .optional()
    .describe("Pull request: a URL or owner/name#number from any folder, or a number in this folder's repo (default: the commit this folder's branch last pushed)"),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up waiting after this long (default ${defaultTimeout}, max ${maxTimeout})`),
})

export type ChecksGit = Pick<GitRunner, 'remoteUrl' | 'maybe'>

export interface ChecksDeps {
  git: ChecksGit
  client: Rest
  listen: Listen
  timing: Timing
  settled(conversation: string, sha: string, outcome: CheckOutcome): void
}

const pullOf = async (git: ChecksGit, cwd: string, pr: number | string | undefined) => {
  if (typeof pr === 'string') {
    const reference = pullReference(pr)
    if (!reference) throw new Error(`"${pr}" isn't a pull request; pass a GitHub pull request URL or owner/name#number.`)
    return reference
  }
  const repo = await repoOf(git, cwd)
  if (!repo) throw new Error("This folder isn't in a GitHub repo; pass the pull request as a URL or owner/name#number.")
  return { path: repo.path, number: pr }
}

const commitOf = async ({ git, client }: ChecksDeps, cwd: string, { path, number }: { path: string; number: number | undefined }) => {
  if (number !== undefined) return (await client.rest<{ head: { sha: string } }>('GET', `${path}/pulls/${number}`)).head.sha
  const pushed = await git.maybe(cwd, ['rev-parse', '--verify', '--quiet', '@{upstream}'], { read: true })
  if (!pushed) throw new Error("This folder's branch has no upstream; push it, or pass a PR number.")
  return pushed
}

export const checksTool = (deps: ChecksDeps): Tool<typeof input> => ({
  name: 'pr_checks',
  description:
    "Wait for a pull request's CI checks and get the result, from any folder when given a PR URL or owner/name#number. Returns at the first failure, on timeout or when the user sends a message. Use it instead of sleep and gh pr checks.",
  input,
  effect: 'read',
  needs: ['folder'],
  timeoutMs: maxTimeout + settleGrace,
  async run({ pr, timeout_ms = defaultTimeout }, { cwd, conversation, signal, progress }) {
    const pull = await pullOf(deps.git, cwd, pr)
    const sha = await commitOf(deps, cwd, pull)
    const spoke = deps.listen(conversation.id)
    try {
      const read = () => readChecks(deps.client, pull.path, sha)
      return `Checks on ${shortSha(sha)}: ${await waitChecks({ read, settled: outcome => deps.settled(conversation.id, sha, outcome), progress, signal, spoke: spoke.signal, timeoutMs: timeout_ms, timing: deps.timing })}`
    } finally {
      spoke.stop()
    }
  },
})
