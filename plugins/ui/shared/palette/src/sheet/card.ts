import type { PaletteCard, PaletteReview } from '../contract'
import { button, delayed, div, focusable, icon, show, span, spinner, type Sig } from '@sand/dom'

export const cardView = (card: PaletteCard) =>
  div(
    { class: 'mx-2 mb-1 rounded-xl bg-neutral-900 px-3 py-2' },
    card.label ? div({ class: 'mb-1 text-xs font-medium text-neutral-500' }, card.label) : null,
    div(
      { class: 'flex items-center gap-3' },
      span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(card.icon ?? 'folder', 16)),
      div(
        { class: 'flex min-w-0 flex-col' },
        div({ class: 'truncate text-sm text-neutral-100' }, card.title),
        card.detail ? div({ class: ['truncate text-xs', card.warn ? 'text-warning-400' : 'text-neutral-500', card.mono && 'font-mono'] }, card.detail) : null,
      ),
    ),
  )

export const reviewView = (review: PaletteReview, busy: Sig<boolean>, progress: Sig<string>, confirm: () => void) => {
  const waiting = delayed(busy)
  return div(
    { class: 'mx-3 mt-1 mb-3 rounded-xl bg-neutral-900 px-4 py-3' },
    div(
      { class: 'flex flex-col gap-2 pb-3 text-sm' },
      review.rows.map(row =>
        div(
          { class: 'flex gap-4' },
          span({ class: 'w-20 shrink-0 text-neutral-500' }, row.label),
          span({ class: ['min-w-0 flex-1 wrap-anywhere text-neutral-200', row.mono && 'font-mono text-xs'] }, row.value),
        ),
      ),
    ),
    button(
      {
        type: 'button',
        disabled: busy,
        class: ['flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 text-sm font-medium text-white hover:bg-accent-600', focusable],
        onClick: confirm,
      },
      show(waiting, () => spinner()),
      show(waiting.map(shown => !shown), () => icon('check', 14)),
      review.action,
    ),
    show(progress.map(Boolean), () => div({ class: 'truncate pt-2 text-xs text-neutral-500' }, () => progress.get())),
  )
}
