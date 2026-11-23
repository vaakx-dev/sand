import type { LimitWindow, PlanLimits } from '@sand/accounts/contract'
import { findBinary, usageArgs } from './binary'

const HOUR_MS = 3_600_000

const DURATIONS_MS: Record<string, number> = {
  Weekly: 7 * 24 * HOUR_MS,
  'Five Hour': 5 * HOUR_MS,
}

const PERIOD_LABELS: Record<string, string> = {
  Weekly: 'Weekly',
  'Five Hour': '5-hour',
}

const PERIOD = new RegExp(`(${Object.keys(DURATIONS_MS).join('|')}) Limit`)

function windowOf(line: string): LimitWindow | undefined {
  const [group, name, remaining, resets] = line.split('\t')
  const period = name?.match(PERIOD)?.[1]
  const left = Number.parseFloat(remaining ?? '')
  if (!group || !period || !Number.isFinite(left)) return undefined
  const resetsAt = Date.parse(resets ?? '')
  const label = `${PERIOD_LABELS[period]} · ${group.replace(/ Models$/, '')}`
  return {
    id: label,
    label,
    used: Math.min(1, Math.max(0, 1 - left / 100)),
    duration: DURATIONS_MS[period],
    ...(Number.isFinite(resetsAt) && { resetsAt }),
  }
}

function limitsOf(printed: string): PlanLimits | undefined {
  const windows = printed.split('\n').flatMap(line => windowOf(line.trim()) ?? [])
  return windows.length ? { windows } : undefined
}

async function readLimits(folder?: string): Promise<PlanLimits | undefined> {
  const binary = await findBinary()
  if (!binary) return undefined
  const child = Bun.spawn([binary, ...usageArgs(folder)], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' })
  const [printed, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  return code === 0 ? limitsOf(printed) : undefined
}

export { limitsOf, readLimits }
