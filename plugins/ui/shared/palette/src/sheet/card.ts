import type { PaletteCard, PaletteReview } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span, type Sig } from '@vaakx-dev/vrui'

export const cardView = ({ icon, metaLine, rowTitle, sectionHeading }: Kit, card: PaletteCard) =>
  div(
    { class: 'flex flex-col px-2 pb-2' },
    card.label ? sectionHeading(card.label) : null,
    div(
      { class: 'flex items-center gap-3 px-2' },
      span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(card.icon ?? 'folder', 16)),
      div(
        { class: 'flex min-w-0 flex-col' },
        rowTitle(card.title),
        card.detail ? (card.warn ? span({ class: 'truncate text-xs text-warning-400' }, card.detail) : metaLine(span({ class: card.mono && 'font-mono' }, card.detail))) : null,
      ),
    ),
  )

export const reviewView = ({ delayed, primaryAction, spinner }: Kit, review: PaletteReview, busy: Sig<boolean>, progress: Sig<string>, confirm: () => void) =>
  div(
    { class: 'flex flex-col gap-3 px-4 pb-4' },
    div(
      { class: 'flex flex-col gap-2 text-sm' },
      review.rows.map(row =>
        div(
          { class: 'flex gap-4' },
          span({ class: 'w-20 shrink-0 text-neutral-400' }, row.label),
          span({ class: ['min-w-0 flex-1 wrap-anywhere text-neutral-100', row.mono && 'font-mono text-xs'] }, row.value),
        ),
      ),
    ),
    primaryAction(
      { size: 'lg', disabled: busy, class: 'w-full', onClick: confirm },
      show(delayed(busy), () => spinner()),
      review.action,
    ),
    show(progress.map(Boolean), () => div({ class: 'truncate text-xs text-neutral-500' }, () => progress.get())),
  )
