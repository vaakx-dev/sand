import { plural } from '@sand/util'
import type { Change } from './contract'

export interface Queue {
  changes: Change[]
  dropped: number
}

const cap = 50

export const empty: Queue = { changes: [], dropped: 0 }

export const joined = (first: Queue, second: Queue): Queue => {
  const changes = [...first.changes, ...second.changes]
  const over = Math.max(changes.length - cap, 0)
  return { changes: changes.slice(over), dropped: first.dropped + second.dropped + over }
}

export const batchOf = ({ changes, dropped }: Queue, from: string): Change[] => {
  const first = changes[0]
  if (!dropped || !first) return changes
  return [{ at: first.at, from, summary: `${plural(dropped, 'earlier change')} ${dropped === 1 ? 'was' : 'were'} dropped` }, ...changes]
}
