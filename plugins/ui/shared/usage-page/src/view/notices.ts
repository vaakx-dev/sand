import type { UnpricedModel } from '@sand/usage/contract'
import { tokens } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import { agoText } from '../format'
import type { Notice } from '../model'

const leadText = ({ pc, failure }: Notice) => (failure ? `${pc.name} didn't answer (${failure})` : `${pc.name} is offline`)

const strong = (text: string) => span({ class: 'text-neutral-100' }, text)

const noticeText = (notice: Notice, now: Sig<number>) => {
  if (!notice.at) return span(strong(leadText(notice)), ', so its usage is missing.')
  return span(strong(`${leadText(notice)}.`), ' ', () => {
    now.get()
    return `Its usage is from the last time it answered, ${agoText(notice.at)}.`
  })
}

export const offlineNotices = ({ dot, secondaryText }: Kit, notices: Notice[], now: Sig<number>) =>
  notices.map(notice => div({ class: 'flex items-center gap-2' }, dot('neutral'), secondaryText(noticeText(notice, now))))

export const unpricedNote = ({ icon }: Kit, item: UnpricedModel) =>
  div(
    { class: 'flex items-start gap-2 text-xs text-neutral-500' },
    span({ class: 'inline-flex pt-px' }, icon('info', 'sm')),
    span(span({ class: 'text-neutral-200' }, `${item.model} has no price,`), ` so its ${tokens(item.tokens)} tokens are left out of cost. Add one under [plugins.accounts.prices] in sand.toml.`),
  )
