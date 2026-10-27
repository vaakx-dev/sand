import type { Models } from '@sand/web-client/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { ModelSetupState } from '../setup'
import { screen } from './layout'

const modelLine = (models: Models, id?: string) =>
  id ? `New threads use ${models.info(id)?.label ?? id}. Change it in Settings → Models.` : 'Pick a model in Settings → Models.'

export const doneStep = (kit: Kit, setup: ModelSetupState, models: Models) => {
  const { doneMark, primaryAction, setupHeading, setupNote } = kit
  return screen(kit, 2, doneMark(), setupHeading("You're set"), setupNote(modelLine(models, setup.model.get())), primaryAction({ onClick: setup.close }, 'Start a thread'))
}
