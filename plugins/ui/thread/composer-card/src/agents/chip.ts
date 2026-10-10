import { derive, div, list, show } from '@sand/dom'
import { chipButton, runChip } from './run'
import type { Working } from './working'

const moreChip = (working: Working) =>
  chipButton(
    working,
    'shrink-0 text-neutral-400',
    derive(() => `${working.more.get()} more running`),
    derive(() => `+${working.more.get()} more`),
  )

export const agentsChip = (working: Working) =>
  show(
    derive(() => working.runs.get().length > 0),
    () =>
      div(
        { class: 'mb-1 flex min-w-0 flex-wrap gap-1' },
        list(working.shown, run => run.id, run => runChip(run, working), div({ class: 'contents' })),
        show(
          derive(() => working.more.get() > 0),
          () => moreChip(working),
        ),
      ),
  )
