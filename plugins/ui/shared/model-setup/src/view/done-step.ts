import type { Models } from '@sand/web-client/contract'
import { doneMark, primaryAction, setupHeading, setupNote } from '@sand/dom'
import type { ModelSetupState } from '../setup'
import { screen } from './layout'

const labelOf = (models: Models, id: string) => models.info(id)?.label ?? id

const threadsLine = (models: Models, id?: string) => (id ? `New threads use ${labelOf(models, id)}.` : 'You pick a model when you start a thread.')

const namesLine = (setup: ModelSetupState, models: Models) => {
  if (!setup.naming.get()) return 'Threads keep their first message as a name.'
  const id = setup.namer.get()
  return id ? `${labelOf(models, id)} names them.` : ''
}

export const doneStep = (setup: ModelSetupState, models: Models) =>
  screen(
    3,
    doneMark(),
    setupHeading("You're set"),
    setupNote([threadsLine(models, setup.model.get()), namesLine(setup, models), 'Change either in Settings → Models.'].filter(Boolean).join(' ')),
    primaryAction({ onClick: setup.close }, 'Start a thread'),
  )
