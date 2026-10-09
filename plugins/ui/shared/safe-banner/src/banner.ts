import { div, icon, quietButton, span } from '@sand/dom'
import type { SafeSource } from './source'

export const bannerView = (source: SafeSource) =>
  div(
    { class: 'w-full px-3 pt-2' },
    div(
      {
        role: 'status',
        class: 'flex w-full items-center gap-3 rounded-lg bg-warning-950 px-3 py-1 text-sm animate-fade',
      },
      span({ class: 'inline-flex shrink-0 text-warning-400' }, icon('alert', 14)),
      div(
        { class: 'flex min-w-0 flex-1 items-baseline gap-2' },
        span({ class: 'truncate text-neutral-100' }, 'Safe mode'),
        span({ class: 'truncate text-xs text-neutral-400' }, 'Only built-in plugins are running'),
      ),
      quietButton({ size: 'sm', disabled: source.busy, onClick: () => void source.leave() }, 'Leave safe mode'),
    ),
  )
