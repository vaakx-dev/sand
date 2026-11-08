import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { Slots } from './slots'

export const tab = ({ metaLine }: Kit, slots: Slots, hidden: () => boolean) =>
  div(
    { class: 'flex justify-end px-4 pb-1', hidden: () => hidden() || slots.empty('tab').get() },
    metaLine(slots.host('tab', 'flex items-center gap-1')),
  )
