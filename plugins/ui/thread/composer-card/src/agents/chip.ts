import { contextMenu, derive, div, list, show } from '@sand/dom'
import { runButton, runChip } from './run'
import type { Working } from './working'

const moreChip = (working: Working) =>
  runButton(working, { title: derive(() => `${working.more.get()} more running`) }, derive(() => `+${working.more.get()} more`))

export const agentsChip = (working: Working) => {
  const menu = contextMenu()
  return show(
    () => working.runs.get().length > 0,
    () =>
      div(
        { class: 'mb-1 flex min-w-0 flex-wrap gap-1' },
        list(working.shown, run => run.id, run => runChip(run, working, menu), div({ class: 'contents' })),
        show(
          () => working.more.get() > 0,
          () => moreChip(working),
        ),
        menu.view(),
      ),
  )
}
