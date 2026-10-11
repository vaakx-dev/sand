import type { UnpricedModel } from '@sand/usage/contract'
import { div, dot, span, type Sig } from '@sand/dom'
import { tokens } from '@sand/kit'
import { agoText } from '../format'
import type { Notice } from '../model'
import { muted } from './parts'

const leadText = ({ pc, failure }: Notice) => (failure ? `${pc.name} didn't answer (${failure})` : `${pc.name} is offline`)

const strong = (text: string) => span({ class: 'font-medium text-neutral-100' }, text)

const noticeText = (notice: Notice, now: Sig<number>) => {
  if (!notice.at) return span(strong(leadText(notice)), ', so its usage is missing.')
  return span(strong(`${leadText(notice)}.`), ' ', () => {
    now.get()
    return `Its usage is from the last time it answered, ${agoText(notice.at)}.`
  })
}

const offlineNotice = (notice: Notice, now: Sig<number>) =>
  div({ class: 'flex items-center gap-3 rounded-lg bg-warning-950 px-3 py-2 text-xs text-neutral-300' }, dot('warning'), noticeText(notice, now))

export const offlineNotices = (notices: Notice[], now: Sig<number>) =>
  notices.length ? div({ class: 'flex flex-col gap-2' }, notices.map(notice => offlineNotice(notice, now))) : null

export const unpricedNotes = (unpriced: UnpricedModel[]) =>
  unpriced.length
    ? div(
        { class: 'flex flex-col gap-1' },
        unpriced.map(item =>
          muted(`${item.model} has no price, so ${tokens(item.tokens)} tokens are left out of cost. Add it under [plugins.llm-accounts.prices] in sand.toml.`),
        ),
      )
    : null
