import { derive, div, dynamicChild, hint, overlay, quietButton, sheet, sheetHead, show } from '@sand/dom'
import type { Fleet } from '../fleet/model'
import { runStatus } from '../fleet/run'
import { plural } from '../fleet/text'
import { chooseBody } from './choose'
import { progressBody } from './progress'

type Mode = 'run' | 'choose' | 'none'

const openTab = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer')

const runTitle = (fleet: Fleet) => {
  const run = fleet.run.get()
  if (!run) return ''
  if (!fleet.runFinished.get()) return `Updating to ${run.name}`
  const pcs = fleet.pcs.get()
  const done = run.keys.filter(key => runStatus(pcs.find(pc => pc.key === key), run.build).kind === 'done').length
  if (done === run.keys.length) return run.keys.length === 1 ? `Updated to ${run.name}` : `${plural(done, 'PC')} updated`
  return `${done} of ${plural(run.keys.length, 'PC')} updated`
}

export const updateSheet = (fleet: Fleet, close: () => void) => {
  const mode = derive<Mode>(() => (fleet.run.get() ? 'run' : fleet.target.get() ? 'choose' : 'none'))
  const title = () => (mode.get() === 'run' ? runTitle(fleet) : (fleet.target.get()?.name ?? 'Updates'))
  const notes = () => fleet.target.get()?.notesUrl
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Update sand', class: 'max-w-lg' },
      sheetHead(
        title,
        close,
        show(derive(() => mode.get() === 'choose' && !!notes()), () => quietButton({ onClick: () => openTab(notes() ?? '') }, 'Release notes')),
      ),
      dynamicChild(mode, current => {
        if (current === 'run') return progressBody(fleet, close)
        if (current === 'choose') return chooseBody(fleet, close)
        return div(hint('Looking for a newer sand…'))
      }),
    ),
  )
}
