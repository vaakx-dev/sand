import { div } from '@vaakx-dev/vrui'
import type { Slots } from './slots'

export const tab = (slots: Slots, hidden: () => boolean) =>
  div(
    { class: 'flex justify-end px-4 pb-1 text-xs text-neutral-500', hidden: () => hidden() || slots.empty('tab').get() },
    slots.host('tab', 'flex items-center gap-1'),
  )
