import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'
import { HOUR_MS, limitWindow, WEEK_MS } from '@sand/app-plan'
import { agy, usageArgs } from './binary'

const DURATIONS_MS: Record<string, number> = {
  Weekly: WEEK_MS,
  'Five Hour': 5 * HOUR_MS,
}

const PERIOD = new RegExp(`(${Object.keys(DURATIONS_MS).join('|')}) Limit`)

function windowOf(line: string): LimitWindow | undefined {
  const [group, name, remaining, resets] = line.split('\t')
  const period = name?.match(PERIOD)?.[1]
  const left = Number.parseFloat(remaining ?? '')
  if (!group || !period || !Number.isFinite(left)) return undefined
  return limitWindow({ used: 1 - left / 100, durationMs: DURATIONS_MS[period], resetsAt: Date.parse(resets ?? ''), scope: group.replace(/ Models$/, '') })
}

function limitsOf(printed: string): PlanLimits | undefined {
  const windows = printed.split('\n').flatMap(line => windowOf(line.trim()) ?? [])
  return windows.length ? { windows } : undefined
}

async function readLimits(folder?: string): Promise<PlanLimits | undefined> {
  const child = Bun.spawn([await agy.require(), ...usageArgs(folder)], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
  const [printed, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  return code === 0 ? limitsOf(printed) : undefined
}

export { limitsOf, readLimits }
