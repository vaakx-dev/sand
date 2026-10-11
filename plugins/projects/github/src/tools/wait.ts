import { plural, untilAborted } from '@sand/kit'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { byOutcome } from '../pr/checks'
import { fetchPr, viewPr } from '../pr/fetch'
import { formatPr } from '../pr/format'
import type { PrView } from '../pr/types'
import { prInput } from './status'

const pollMs = 60_000
const checksGraceMs = 180_000

const input = z.object({
  pr: prInput,
  timeout_minutes: z.number().int().positive().max(120).default(30).describe('Stop waiting after this many minutes'),
})

const activity = (pr: PrView) => [pr.headRefOid, pr.state, pr.comments.length, pr.reviews.length].join('|')

const settled = (pr: PrView, started: number) => {
  if (!pr.statusCheckRollup.length) return Date.now() - started >= checksGraceMs
  return !byOutcome(pr.statusCheckRollup, 'pending').length
}

const stopReason = (pr: PrView, before: string, started: number, minutes: number) => {
  if (activity(pr) !== before) return 'New activity on the PR'
  if (settled(pr, started)) return pr.statusCheckRollup.length ? 'Checks finished' : 'No checks started'
  if (Date.now() - started >= minutes * 60_000) return `Still pending after ${plural(minutes, 'minute')}`
  return undefined
}

export const waitTool: Tool<typeof input> = {
  name: 'pr_wait',
  description: "Wait until a PR's checks finish, new feedback arrives or its state changes. Returns the pr_status summary.",
  input,
  async run({ pr, timeout_minutes }, { cwd, signal }) {
    const started = Date.now()
    const first = await viewPr(pr, cwd, signal)
    const before = activity(first)
    let reason = stopReason(first, before, started, timeout_minutes)
    while (!reason) {
      await untilAborted(Bun.sleep(pollMs), signal)
      reason = stopReason(await viewPr(first.url, cwd, signal), before, started, timeout_minutes)
    }
    return `${reason}.\n${formatPr(await fetchPr(first.url, cwd, signal))}`
  },
}
