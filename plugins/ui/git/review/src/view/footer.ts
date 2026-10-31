import { div, effect, span } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { finishSheet } from './finish'

const waiting = (count: number) => {
  if (!count) return 'No comments in your review yet'
  return `${count} ${count === 1 ? 'comment' : 'comments'} waiting in your review`
}

export const footer = (tab: CodeTab) => {
  const { kit, pending } = tab
  const count = () => pending.review.get().comments.length
  let closeSheet: (() => void) | undefined
  effect(() => () => closeSheet?.())
  const finish = () => {
    closeSheet?.()
    closeSheet = finishSheet(tab)
  }
  return div(
    { class: [kit.layer.sticky, 'sticky bottom-0 bg-neutral-950'] },
    kit.paneHead(
      { class: 'border-t border-neutral-800' },
      span({ class: 'min-w-0 flex-1 truncate text-sm text-neutral-400' }, () => waiting(count())),
      kit.primaryAction({ size: 'sm', onClick: finish }, () => (count() ? `Finish review (${count()})` : 'Finish review')),
    ),
  )
}
