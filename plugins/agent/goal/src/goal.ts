import { plural } from '@sand/kit'
import type { Entry } from '@sand/messages'

export const entryType = 'goal'

export interface Goal {
  objective: string
  status: 'active' | 'met' | 'cleared'
  checks: number
  reason?: string
}

export const activeGoal = (path: Entry[]) => {
  const goal = path.findLast(entry => entry.type === entryType)?.data as Goal | undefined
  return goal?.status === 'active' ? goal : undefined
}

export const sameGoal = (a: Goal | undefined, b: Goal) => a?.objective === b.objective && a.checks === b.checks

export const describeGoal = (goal: Goal) => {
  const checks = goal.checks ? plural(goal.checks, 'check') : 'not checked yet'
  return [`Goal active: ${goal.objective} (${checks})`, goal.reason && `Last check: ${goal.reason}`].filter(Boolean).join('\n')
}
