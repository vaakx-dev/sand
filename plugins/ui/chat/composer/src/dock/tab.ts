import { div } from '@vaakx-dev/vrui'
import { tuck } from './glass'
import type { Slots } from './slots'

export const tab = (slots: Slots, hidden: () => boolean) =>
  div(
    {
      class: 'absolute right-4 z-0 flex items-center gap-1 rounded-t-xl bg-neutral-900 px-1 pt-px pb-4 text-xs text-neutral-500',
      style: { bottom: `calc(100% - ${tuck})` },
      hidden: () => hidden() || slots.empty('tab').get(),
    },
    slots.host('tab', 'flex items-center gap-1'),
  )
