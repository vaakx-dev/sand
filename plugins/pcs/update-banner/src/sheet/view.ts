import { derive, dynamicChild, hint, openTab, overlay, quietButton, sheet, sheetHead, show } from '@sand/dom'
import { plural } from '@sand/kit'
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

export const updateSheet = (fleet: Fleet, close: () => void) => {
  const mode = derive(() => modeOf(fleet))
  const title = () => (mode.get() === 'run' ? runTitle(fleet) : (fleet.target.get()?.name ?? 'Updates'))
  const notes = () => fleet.target.get()?.notesUrl
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Update sand', class: 'max-w-lg' },
      sheetHead(
        title,
        close,
        show(
          () => mode.get() === 'choose' && !!notes(),
          () => quietButton({ onClick: () => openTab(notes() ?? '') }, 'Release notes'),
        ),
      ),
      dynamicChild(mode, current => {
        if (current === 'run') return progressBody(fleet, close)
        if (current === 'choose') return chooseBody(fleet, close)
        return hint('Looking for a newer sand…')
      }),
    ),
  )
}
