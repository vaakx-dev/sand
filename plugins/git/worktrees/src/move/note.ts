import { plural } from '@sand/util'
import type { WorktreeRecord } from '../records/schema'

export interface MoveNote {
  from: string
  cwd: string
  record: WorktreeRecord
  carried: number
  carry: boolean
}

const changesLine = ({ from, carried, carry }: MoveNote) => {
  if (carried) return `The uncommitted changes (${plural(carried, 'file')}) came along, so ${from} no longer has them.`
  return carry ? 'There were no uncommitted changes to bring along.' : `Uncommitted changes stayed behind in ${from}.`
}

export const moveNote = (note: MoveNote) =>
  [
    `This thread moved to its own git worktree at ${note.cwd}, on the new branch ${note.record.branch} made from ${note.record.base}.`,
    note.record.temp ? 'Sand will soon rename that branch to something descriptive.' : '',
    changesLine(note),
    `Work and run commands in ${note.cwd} from now on, not in ${note.from}.`,
  ]
    .filter(Boolean)
    .join(' ')
