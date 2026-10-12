import type { PaletteCard, PaletteReview } from '../contract'
import { delayed } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'

export const cardView = ({ icon }: Kit, card: PaletteCard) =>
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

export const reviewView = ({ icon, primaryAction, spinner }: Kit, review: PaletteReview, busy: Sig<boolean>, progress: Sig<string>, confirm: () => void) =>
  div(
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
    primaryAction(
      { size: 'lg', disabled: busy, class: 'w-full', onClick: confirm },
      dynamicChild(delayed(busy), waiting => (waiting ? spinner() : icon('check', 14))),
      review.action,
    ),
    show(progress.map(Boolean), () => div({ class: 'truncate pt-2 text-xs text-neutral-500' }, () => progress.get())),
  )
