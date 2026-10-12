import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, show } from '@vaakx-dev/vrui'
import { runButton, runChip } from './run'
import type { Working } from './working'

const moreChip = (kit: Kit, working: Working) =>
  runButton(kit, working, { title: derive(() => `${working.more.get()} more running`) }, derive(() => `+${working.more.get()} more`))

export const agentsChip = (kit: Kit, working: Working) => {
  const { contextMenu } = kit
  const menu = contextMenu()
  return show(
    () => working.runs.get().length > 0,
    () =>
      div(
        { class: 'mb-1 flex min-w-0 flex-wrap gap-1' },
        list(working.shown, run => run.id, run => runChip(kit, run, working, menu), div({ class: 'contents' })),
        show(
          () => working.more.get() > 0,
          () => moreChip(kit, working),
        ),
        menu.view(),
      ),
  )
}
