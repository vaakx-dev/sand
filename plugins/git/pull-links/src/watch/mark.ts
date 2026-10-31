import type { WatchMark } from '../book/record'
import type { PullActivity, PullItem } from '../activity/types'

export type Change =
  | { kind: 'failed'; names: string[]; head: string }
  | { kind: 'passed'; head: string }
  | { kind: 'conflict' }
  | { kind: 'item'; item: PullItem }

export const failingNames = (activity: PullActivity) => [...new Set(activity.checks.filter(check => check.state === 'fail').map(check => check.name))]

const allPassed = (activity: PullActivity) => activity.checks.length > 0 && activity.checks.every(check => check.state === 'pass' || check.state === 'skip')

const latestAt = (items: PullItem[], floor: number) => items.reduce((latest, item) => Math.max(latest, item.at), floor)

const passedHead = (activity: PullActivity, before?: string) => (allPassed(activity) ? activity.head : before)

const marked = (activity: PullActivity, since: number, passed?: string): WatchMark => ({
  head: activity.head,
  failed: failingNames(activity),
  ...(passed ? { passed } : {}),
  conflict: activity.conflict,
  since,
})

export const baselineMark = (activity: PullActivity) => marked(activity, latestAt(activity.items, 0), passedHead(activity))

export const nextMark = (mark: WatchMark, activity: PullActivity) => marked(activity, latestAt(activity.items, mark.since), passedHead(activity, mark.passed))

export const changesSince = (mark: WatchMark, activity: PullActivity): Change[] => {
  const reported = mark.head === activity.head ? mark.failed : []
  const failed = failingNames(activity).filter(name => !reported.includes(name))
  const changes: Change[] = []
  if (failed.length) changes.push({ kind: 'failed', names: failed, head: activity.head })
  if (allPassed(activity) && mark.passed !== activity.head) changes.push({ kind: 'passed', head: activity.head })
  if (activity.conflict && !mark.conflict) changes.push({ kind: 'conflict' })
  for (const item of activity.items) if (item.at > mark.since && item.author !== activity.viewer) changes.push({ kind: 'item', item })
  return changes
}

export const quietLimit = 10

export const onlyTalk = (changes: Change[]) => changes.every(change => change.kind === 'item')

export const sameMark = (a: WatchMark, b: WatchMark) => JSON.stringify(a) === JSON.stringify(b)
