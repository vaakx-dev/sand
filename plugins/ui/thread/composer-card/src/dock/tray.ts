import { div, SPACE, span } from '@sand/dom'
import type { Slots } from './slots'

const tuck = SPACE['4']

export const tray = (slots: Slots) =>
  div(
    {
      class: 'cc-tray relative mx-4 flex min-w-0 items-center gap-2 rounded-2xl bg-neutral-900 px-1 pb-1 text-xs text-neutral-500 ring-1 ring-neutral-800 animate-fade',
      style: { marginTop: `calc(-1 * ${tuck})`, paddingTop: `calc(${tuck} + ${SPACE['1']})` },
    },
    slots.host('tray-start', 'flex min-w-0 items-center gap-1'),
    span({ class: 'min-w-2 flex-1' }),
    slots.host('tray-end', 'flex min-w-0 shrink-0 items-center gap-1'),
  )
