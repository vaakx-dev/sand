import type { TurnInfo } from '@sand/chat/contract'
import type { ListedTurn } from '@sand/git-snapshots/contract'
import { plural } from '@sand/util'
import { derive, div, show, span, type Child, type Sig } from '@vaakx-dev/vrui'
import type { TurnParts } from '../parts'
import { hasChanges, inFolder, turnScopeId } from '../snapshots/turn'
import { turnMenu } from './menu'

const reviewable = (parts: TurnParts, turn: TurnInfo, snapshot: Sig<ListedTurn | undefined>) => {
  const here = parts.threads.read(() => parts.ctx.threads.get(turn.session)?.info.cwd)
  return derive(() => {
    const found = snapshot.get()
    const cwd = here.get()
    return Boolean(parts.panel.get() && found && cwd && inFolder(found, cwd))
  })
}

const turnCard = (parts: TurnParts, turn: TurnInfo, snapshot: Sig<ListedTurn | undefined>) => {
  const { kit, diff } = parts.ctx
  const review = () => {
    const found = snapshot.get()
    if (found) parts.panel.get()?.show(turnScopeId(found))
  }
  const canReview = reviewable(parts, turn, snapshot)
  return div(
    { class: 'mb-3 flex h-10 items-center gap-2 rounded-xl border border-neutral-800 pl-3 pr-1 text-sm text-neutral-100' },
    span({ class: 'flex shrink-0 text-neutral-500' }, kit.icon('folder', 'sm')),
    span({ class: 'min-w-0 truncate' }, () => `Changed ${plural(snapshot.get()?.files ?? 0, 'file')}`),
    diff.marks.stat(
      () => snapshot.get()?.add ?? 0,
      () => snapshot.get()?.del ?? 0,
    ),
    span({ class: 'flex-1' }),
    show(
      () => canReview.get(),
      () => kit.quietButton({ size: 'sm', title: 'Open these changes in the Changes panel', onClick: review }, 'Review'),
    ),
    turnMenu(parts, turn.device, snapshot),
  )
}

export const turnFooter =
  (parts: TurnParts) =>
  (turn: TurnInfo): Child | null => {
    if (turn.running) return null
    const turns = parts.store.of(turn.session)
    const snapshot = derive(() => turns.get().find(found => found.turn === turn.startEntry))
    return show(
      () => hasChanges(snapshot.get()),
      () => turnCard(parts, turn, snapshot),
    )
  }
