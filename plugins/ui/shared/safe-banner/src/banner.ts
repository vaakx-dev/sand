import { bannerTitle, div, icon, quietButton, span, statusBanner } from '@sand/dom'
import type { SafeSource } from './source'

export const bannerView = (source: SafeSource) =>
  div(
    { class: 'w-full px-3 pt-2' },
    statusBanner(
      {},
      span({ class: 'inline-flex shrink-0 text-warning-400' }, icon('alert', 14)),
      div(
        { class: 'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2' },
        bannerTitle('Safe mode'),
        span({ class: 'truncate text-xs text-neutral-400' }, 'Only built-in plugins are running'),
      ),
      quietButton({ size: 'sm', disabled: source.busy, onClick: () => void source.leave() }, 'Leave safe mode'),
    ),
  )
