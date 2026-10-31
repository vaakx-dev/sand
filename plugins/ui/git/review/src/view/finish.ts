import { place } from '@sand/layout/place'
import type { ReviewEvent } from '@sand/pull-review/contract'
import { show, sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { CodeTab } from '../model/state'

const events: { value: ReviewEvent; label: string }[] = [
  { value: 'COMMENT', label: 'Comment' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REQUEST_CHANGES', label: 'Request changes' },
]

const plural = (count: number) => `${count} ${count === 1 ? 'comment' : 'comments'}`

export const finishSheet = (tab: CodeTab) => {
  const { kit, ctx, pending } = tab
  const summary = sig('')
  const event = sig<ReviewEvent>('COMMENT')
  const discarding = sig(false)
  const count = () => pending.review.get().comments.length
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const blocked = () => {
    const text = summary.get().trim()
    if (event.get() === 'REQUEST_CHANGES') return !text
    return event.get() === 'COMMENT' && !text && !count()
  }
  const submit = async () => {
    if (!blocked() && (await pending.finish(event.get(), summary.get().trim()))) close()
  }
  const discard = async () => {
    if (!discarding.get()) return discarding.set(true)
    if (await pending.discard()) close()
  }
  unplace = place(
    ctx,
    'overlay',
    () =>
      kit.overlay(
        close,
        kit.sheet(
          { 'aria-label': 'Finish your review', size: 'md' },
          kit.sheetHead({ title: 'Finish your review', close }),
          kit.sheetBody(
            {},
            kit.textArea({ bindValue: summary, rows: 5, placeholder: 'Summary (needed for Request changes)', 'aria-label': 'Summary' }),
            kit.segmented(events, event, value => event.set(value), { label: 'Review outcome', fill: true }),
          ),
          kit.sheetFoot(
            show(
              () => count() > 0,
              () =>
                kit.quietButton({ surface: 'raised', disabled: pending.busy, onClick: () => void discard() }, () =>
                  discarding.get() ? `Discard ${plural(count())}? Click again` : `Discard ${plural(count())}`,
                ),
            ),
            kit.primaryAction({ disabled: () => blocked() || pending.busy.get(), onClick: () => void submit() }, 'Submit review'),
          ),
        ),
      ),
    100,
  )
  return close
}
