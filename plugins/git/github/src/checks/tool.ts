import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Check, CheckOutcome } from './read'
import { type TargetGit, watchedOf } from './target'
import type { Listen } from './user'
import { type Timing, waitChecks } from './wait'
import { type Logs, whyFailed } from './why'

interface ChecksDeps {
  git: TargetGit
  client: Logs
  listen: Listen
  timing: Timing
  settled(conversation: string, sha: string, outcome: CheckOutcome): void
}

const defaultTimeout = 1_200_000
const maxTimeout = 3_600_000
const settleGrace = 60_000

const input = z.object({
  target: z
    .union([z.number().int().positive(), z.string().trim().min(1)])
    .optional()
    .describe(
      "What to wait on: a PR number, URL or owner/name#number; a branch, tag or commit SHA in this folder's repo; or an Actions run URL or run:<id>. URLs work from any folder. Default: the commit this folder's branch last pushed, which is its PR's head.",
    ),
  timeout_ms: z.number().int().positive().max(maxTimeout).optional().describe(`Give up waiting after this long (default ${defaultTimeout}, max ${maxTimeout})`),
})

const checksTool = (deps: ChecksDeps): Tool<typeof input> => ({
  name: 'pr_checks',
  description:
    "Wait for GitHub CI and get the result: every check on a pull request, branch, tag or commit, or the jobs of one Actions workflow run. With no target it waits on the commit this folder's branch last pushed. Returns at the first failure, with each failed job's failing tests or step and their error lines, on timeout or when the user sends a message. Use it instead of sleep, gh pr checks and gh run watch.",
  input,
  effect: 'read',
  needs: ['folder'],
  timeoutMs: maxTimeout + settleGrace,
  async run({ target, timeout_ms = defaultTimeout }, { cwd, conversation, signal, progress }) {
    const watched = await watchedOf(deps, cwd, target)
    const explain = (failed: Check) => whyFailed(deps.client, watched.repo, failed)
    const settled = (outcome: CheckOutcome) => {
      if (watched.kind === 'commit') deps.settled(conversation.id, watched.sha, outcome)
    }
    const spoke = deps.listen(conversation.id)
    try {
      return `${watched.title}: ${await waitChecks({ read: watched.read, explain, settled, progress, signal, spoke: spoke.signal, timeoutMs: timeout_ms, timing: deps.timing })}`
    } finally {
      spoke.stop()
    }
  },
})

export { type ChecksDeps, checksTool }
