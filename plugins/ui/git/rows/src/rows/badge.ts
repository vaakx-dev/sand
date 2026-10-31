import { plural } from '@sand/util'
import { span } from '@vaakx-dev/vrui'
import type { Change } from '../places/view'

const lines = ({ add, del }: Change) => [
  add > 0 && span({ class: 'text-success-400' }, `+${add}`),
  del > 0 && span({ class: 'text-danger-400' }, `−${del}`),
]

const shown = (change: Change) => (change.add || change.del ? lines(change) : plural(change.files, 'file'))

export const changeBadge = (change: Change) =>
  span(
    { class: 'inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-neutral-400', title: `${plural(change.files, 'file')} not committed` },
    shown(change),
  )
