import type { Entry } from '@sand/messages'

export const entryType = 'goal'

export type GoalStatus = 'active' | 'met' | 'cleared'

export interface Goal {
  objective: string
  status: GoalStatus
  checks: number
  reason?: string
}

export const latestGoal = (path: Entry[]) => path.findLast(entry => entry.type === entryType)?.data as Goal | undefined

export const activeGoal = (path: Entry[]) => {
  const goal = latestGoal(path)
  return goal?.status === 'active' ? goal : undefined
}

export const sameGoal = (a: Goal | undefined, b: Goal) => a?.objective === b.objective && a.checks === b.checks

export const describeGoal = (goal: Goal) => {
  const checks = goal.checks ? `${goal.checks} ${goal.checks === 1 ? 'check' : 'checks'}` : 'not checked yet'
  return [`Goal active: ${goal.objective} (${checks})`, goal.reason && `Last check: ${goal.reason}`].filter(Boolean).join('\n')
}
