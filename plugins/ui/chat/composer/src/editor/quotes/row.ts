import type { Kit } from '@sand/ui-kit/contract'
import { div, prevent } from '@vaakx-dev/vrui'

export interface QuoteActions {
  reply(): void
  remove(): void
}

export const quoteRow = ({ closeButton, quoteButton }: Kit, text: string, actions: QuoteActions) =>
  div(
    { class: 'flex items-start gap-1 py-2 pl-1 text-sm' },
    quoteButton({ class: 'flex-1', title: 'Reply below this quote', onMouseDown: prevent, onClick: actions.reply }, text),
    closeButton({ title: 'Remove quote', size: 'sm', onMouseDown: prevent, onClick: actions.remove }),
  )
