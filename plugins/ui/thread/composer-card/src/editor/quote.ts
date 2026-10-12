import { closeButton, div, prevent, quoteButton } from '@sand/dom'
import type { QuoteSegment } from './segments'

export interface QuoteActions {
  reply(): void
  remove(): void
}

export const quoteRow = (part: QuoteSegment, actions: QuoteActions) =>
  div(
    { class: 'flex items-start gap-1 py-1 pl-1 text-sm animate-rise' },
    quoteButton({ class: 'flex-1', title: 'Reply below this quote', onMouseDown: prevent, onClick: actions.reply }, part.text),
    closeButton({ title: 'Remove', size: 'sm', onMouseDown: prevent, onClick: actions.remove }),
  )
