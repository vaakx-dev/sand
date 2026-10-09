import { derive, div, icon, quietButton, show } from '@sand/dom'
import { plural } from '@sand/kit'
import type { Working } from './working'

export const agentsChip = (working: Working) =>
  show(
    derive(() => working.count.get() > 0),
    () =>
      div(
        { class: 'mb-1 flex min-w-0' },
        quietButton(
          { size: 'sm', class: 'min-w-0', title: 'Show agents', disabled: derive(() => !working.clickable.get()), onClick: working.open },
          icon('bot', 13),
          () => `${plural(working.count.get(), 'agent')} still working`,
        ),
      ),
  )
