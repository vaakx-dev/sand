import { div, SPACE } from '@vaakx-dev/vrui'
import type { Slots } from './slots'

const tuck = SPACE['4']

export const tab = (slots: Slots, hidden: () => boolean) =>
  div(
    {
      class: 'absolute right-4 z-0 flex items-center gap-1 rounded-t-xl bg-neutral-900 px-1 pt-px text-xs text-neutral-500 animate-fade',
      style: { bottom: `calc(100% - ${tuck})`, paddingBottom: tuck },
      hidden: () => hidden() || slots.empty('tab').get(),
    },
    slots.host('tab', 'flex items-center gap-1'),
  )
