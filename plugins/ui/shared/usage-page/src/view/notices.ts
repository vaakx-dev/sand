import type { UnpricedModel } from '@sand/usage/contract'
import { tokens } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import { agoText } from '../format'
import type { Notice } from '../model'

const leadText = ({ pc, failure }: Notice) => (failure ? `${pc.name} didn't answer (${failure})` : `${pc.name} is offline`)

const strong = (text: string) => span({ class: 'font-medium text-neutral-100' }, text)

const noticeText = (notice: Notice, now: Sig<number>) => {
  if (!notice.at) return span(strong(leadText(notice)), ', so its usage is missing.')
  return span(strong(`${leadText(notice)}.`), ' ', () => {
    now.get()
    return `Its usage is from the last time it answered, ${agoText(notice.at)}.`
  })
}

export const offlineNotices = ({ callout }: Kit, notices: Notice[], now: Sig<number>) =>
  notices.length ? div({ class: 'flex flex-col gap-2' }, notices.map(notice => callout('neutral', noticeText(notice, now)))) : null

export const unpricedNotes = ({ note }: Kit, unpriced: UnpricedModel[]) =>
  unpriced.length
    ? div(
        { class: 'flex flex-col gap-1 px-1' },
        unpriced.map(item =>
          note(`${item.model} has no price, so ${tokens(item.tokens)} tokens are left out of cost. Add it under [plugins.llm-accounts.prices] in sand.toml.`),
        ),
      )
    : null
