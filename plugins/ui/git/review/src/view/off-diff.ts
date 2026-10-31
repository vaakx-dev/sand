import type { DiffPatch } from '@sand/git-diff/contract'
import type { PendingComment } from '@sand/pull-review/contract'
import { derive, div, list, show, span, type Sig } from '@vaakx-dev/vrui'
import { commentKey, lineKeys } from '../model/line-keys'
import type { CodeTab } from '../model/state'
import { noteFrame } from './frame'

const heading = (count: number) => `${count} ${count === 1 ? 'comment' : 'comments'} on lines not in this diff`

const placeOf = ({ line, startLine, side }: PendingComment) => {
  const lines = startLine && startLine < line ? `Lines ${startLine}–${line}` : `Line ${line}`
  return side === 'LEFT' ? `${lines}, removed side` : lines
}

const offDiffComment = ({ kit, pending }: CodeTab, comment: Sig<PendingComment>) =>
  div(
    { class: 'flex flex-col gap-1' },
    div(
      { class: 'flex items-center gap-2' },
      kit.metaLine(() => placeOf(comment.get())),
      show(
        () => comment.get().byAgent,
        () => kit.badge('accent', 'Agent'),
      ),
      span({ class: 'flex-1' }),
      kit.iconButton(
        { size: 'sm', title: 'Remove comment', 'aria-label': 'Remove comment', disabled: pending.busy, onClick: () => void pending.remove(comment.get().id) },
        kit.icon('trash', 14),
      ),
    ),
    div({ class: 'whitespace-pre-wrap text-sm' }, () => comment.get().body),
  )

export const offDiffComments = (tab: CodeTab, path: string, patch: DiffPatch) => {
  const shown = new Set(tab.ctx.diff.lines(patch).flatMap(lineKeys))
  const off = derive(() => tab.pending.review.get().comments.filter(comment => comment.path === path && !shown.has(commentKey(comment))))
  return show(
    () => off.get().length > 0,
    () =>
      noteFrame(
        span({ class: 'text-xs text-neutral-500' }, () => heading(off.get().length)),
        list(
          off,
          comment => comment.id,
          comment => offDiffComment(tab, comment),
        ),
      ),
  )
}
