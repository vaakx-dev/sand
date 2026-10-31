import type { ListedTurn, SnapshotSide } from '@sand/git-snapshots/contract'
import { folderName, plural } from '@sand/util'
import type { TurnParts } from '../parts'
import { latestRestore, turnOrdinal } from '../snapshots/turn'
import { notify, notifyError } from './notify'

const confirmed = async ({ ctx }: TurnParts, snapshot: ListedTurn, to: SnapshotSide) => {
  const picked = await ctx.picker.choose(`Restore files to ${to} ${turnOrdinal(snapshot)}?`, [
    {
      label: 'Restore files',
      detail: `Changes the files in ${folderName(snapshot.cwd)} to how they were ${to} this turn. You can undo the restore afterwards.`,
      value: true,
    },
    { label: 'Cancel', value: false },
  ])
  return picked?.value === true
}

const changedText = (made: ListedTurn | undefined) => (made?.files ? `Changed ${plural(made.files, 'file')}` : 'The files already matched')

const undo = async (parts: TurnParts, made: ListedTurn) => {
  try {
    await parts.store.restore({ session: made.session, turn: made.turn, to: 'before' })
    notify(parts.ctx, made.session, { tone: 'success', title: 'Put the files back', detail: changedText(made) })
  } catch (error) {
    notifyError(parts.ctx, made.session, "Couldn't undo the restore", error)
  }
}

export const restoreTurn = async (parts: TurnParts, snapshot: ListedTurn, to: SnapshotSide) => {
  if (!(await confirmed(parts, snapshot, to))) return
  const { session, turn } = snapshot
  try {
    const next = await parts.store.restore({ session, turn, to })
    const made = latestRestore(next.turns, turn, to)
    notify(parts.ctx, session, {
      tone: 'success',
      title: `Restored files to ${to} ${turnOrdinal(snapshot)}`,
      detail: changedText(made),
      actions: made ? [{ label: 'Undo', run: () => undo(parts, made) }] : [],
    })
  } catch (error) {
    notifyError(parts.ctx, session, "Couldn't restore the files", error)
  }
}
