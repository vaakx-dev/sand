import { div, span } from '@vaakx-dev/vrui'
import type { Slots } from './slots'

export const tray = (slots: Slots) =>
  div(
    {
      class: 'relative mx-4 -mt-4 flex min-w-0 items-center gap-2 rounded-b-xl bg-neutral-900 px-1 pt-5 pb-1 text-xs text-neutral-500',
      hidden: slots.empty('tray-start', 'tray-end'),
    },
    slots.host('tray-start', 'flex min-w-0 items-center gap-1'),
    span({ class: 'min-w-2 flex-1' }),
    slots.host('tray-end', 'flex min-w-0 shrink-0 items-center gap-1'),
  )
