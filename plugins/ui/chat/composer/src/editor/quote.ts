import type { Kit } from '@sand/ui-kit/contract'
import { div, prevent } from '@vaakx-dev/vrui'
import type { QuoteSegment } from './segments'

export interface QuoteActions {
  reply(): void
  remove(): void
}

export const quoteRow = ({ closeButton, quoteButton }: Kit, part: QuoteSegment, actions: QuoteActions) =>
  div(
    { class: 'flex items-start gap-1 py-1 pl-1 text-sm animate-rise' },
    quoteButton({ class: 'flex-1', title: 'Reply below this quote', onMouseDown: prevent, onClick: actions.reply }, part.text),
    closeButton({ title: 'Remove', size: 'sm', onMouseDown: prevent, onClick: actions.remove }),
  )
