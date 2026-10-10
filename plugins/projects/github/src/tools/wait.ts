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

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(timer), reject(signal.reason)), { once: true })
  })

const settled = (pr: PrView, started: number) => {
  if (!pr.statusCheckRollup.length) return Date.now() - started >= checksGraceMs
  return !byOutcome(pr.statusCheckRollup, 'pending').length
}

export const waitTool: Tool<typeof input> = {
  name: 'pr_wait',
  description:
    'Wait until a GitHub pull request has no pending checks, gets new comments or reviews, or changes state, then return the same summary as pr_status.',
  input,
  async run({ pr, timeout_minutes }, { cwd, signal }) {
    const started = Date.now()
    const first = await viewPr(pr, cwd, signal)
    const target = first.url
    const before = activity(first)
    let current = first
    let reason = ''
    while (!reason) {
      if (activity(current) !== before) reason = 'New activity on the PR'
      else if (settled(current, started)) reason = current.statusCheckRollup.length ? 'Checks finished' : 'No checks started'
      else if (Date.now() - started >= timeout_minutes * 60_000) reason = `Still pending after ${timeout_minutes} minute${timeout_minutes === 1 ? '' : 's'}`
      else {
        await sleep(pollMs, signal)
        current = await viewPr(target, cwd, signal)
      }
    }
    return `${reason}.\n${formatPr(await fetchPr(target, cwd, signal))}`
  },
}
