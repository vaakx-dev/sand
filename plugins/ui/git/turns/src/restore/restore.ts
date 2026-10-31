import type { ListedTurn, SnapshotSide } from '@sand/git-snapshots/contract'
import { folderName, plural } from '@sand/util'
import type { TurnParts } from '../parts'
import { latestRestore, turnOrdinal } from '../snapshots/turn'

const toastId = (session: string) => `git-turns:${session}`

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
  const { toasts } = parts.ctx
  const id = toastId(made.session)
  const undone = await toasts.attempt(id, "Couldn't undo the restore", () => parts.store.restore({ session: made.session, turn: made.turn, to: 'before' }))
  if (undone) toasts.show({ id, tone: 'success', title: 'Put the files back', detail: changedText(made) })
}

export const restoreTurn = async (parts: TurnParts, snapshot: ListedTurn, to: SnapshotSide) => {
  if (!(await confirmed(parts, snapshot, to))) return
  const { session, turn } = snapshot
  const { toasts } = parts.ctx
  const id = toastId(session)
  const next = await toasts.attempt(id, "Couldn't restore the files", () => parts.store.restore({ session, turn, to }))
  if (!next) return
  const made = latestRestore(next.turns, turn, to)
  toasts.show({
    id,
    tone: 'success',
    title: `Restored files to ${to} ${turnOrdinal(snapshot)}`,
    detail: changedText(made),
    actions: made ? [{ label: 'Undo', run: () => undo(parts, made) }] : [],
  })
}
