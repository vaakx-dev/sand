import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, dynamicChild, show } from '@vaakx-dev/vrui'
import type { Fleet } from '../fleet/model'
import { chooseBody } from './choose'
import { progressBody } from './progress'

type Mode = 'run' | 'choose' | 'none'

const modeOf = (fleet: Fleet): Mode => {
  if (fleet.run.get()) return 'run'
  return fleet.target.get() ? 'choose' : 'none'
}

const runTitle = (fleet: Fleet) => {
  const run = fleet.run.get()
  if (!run) return ''
  if (!fleet.runFinished.get()) return `Updating to ${run.name}`
  const done = fleet.runRows.get().filter(row => row.status.kind === 'done').length
  if (done === run.keys.length) return run.keys.length === 1 ? `Updated to ${run.name}` : `${plural(done, 'PC')} updated`
  return `${done} of ${plural(run.keys.length, 'PC')} updated`
}

export const updateSheet = (kit: Kit, fleet: Fleet, close: () => void) => {
  const { hint, openTab, overlay, quietButton, sheet, sheetHead } = kit
  const mode = derive(() => modeOf(fleet))
  const title = () => (mode.get() === 'run' ? runTitle(fleet) : (fleet.target.get()?.name ?? 'Updates'))
  const notes = () => fleet.target.get()?.notesUrl
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Update sand', size: 'md' },
      sheetHead({
        title,
        close,
        actions: show(
          () => mode.get() === 'choose' && !!notes(),
          () => quietButton({ onClick: () => openTab(notes() ?? '') }, 'Release notes'),
        ),
      }),
      dynamicChild(mode, current => {
        if (current === 'run') return progressBody(kit, fleet, close)
        if (current === 'choose') return chooseBody(kit, fleet, close)
        return hint('Looking for a newer sand…')
      }),
    ),
  )
}
