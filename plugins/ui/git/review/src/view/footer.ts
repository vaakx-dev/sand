import { plural } from '@sand/util'
import { derive, div, dynamicChild, effect, show, span } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { finishSheet } from './finish'

const waiting = (count: number) => (count ? `${plural(count, 'comment')} waiting in your review` : 'No comments in your review yet')

const finishButton = ({ kit, pending }: CodeTab, finish: () => void) => {
  const count = derive(() => pending.review.get().comments.length)
  return dynamicChild(
    count.map(Boolean),
    ready =>
      ready
        ? kit.primaryAction({ size: 'sm', onClick: finish }, () => `Finish review (${count.get()})`)
        : kit.quietButton({ size: 'sm', onClick: finish }, 'Finish review'),
  )
}

export const footer = (tab: CodeTab) => {
  const { kit, pending, live } = tab
  let closeSheet: (() => void) | undefined
  effect(() => () => closeSheet?.())
  const finish = () => {
    closeSheet?.()
    closeSheet = finishSheet(tab)
  }
  return show(live, () =>
    div(
      { class: [kit.layer.sticky, 'sticky bottom-0 bg-neutral-950'] },
      kit.paneHead(
        { class: 'border-t border-neutral-800' },
        kit.metaLine(() => waiting(pending.review.get().comments.length)),
        span({ class: 'flex-1' }),
        finishButton(tab, finish),
      ),
    ),
  )
}
