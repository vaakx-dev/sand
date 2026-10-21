import type { Models } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import type { Kit } from '@sand/ui-kit/contract'
import type { ModelSetupState } from '../setup'
import { problem, screen } from './layout'
import { modelList } from './models'

export const modelStep = (kit: Kit, setup: ModelSetupState, models: Models, changes: Pulse) => {
  const { primaryAction, quietButton, setupColumn, setupFooter, setupHeading, setupNote } = kit
  return screen(
    kit,
    2,
    setupHeading('Pick a model'),
    setupNote('You can switch at any time.'),
    setupColumn(modelList(kit, models, changes, setup.model, { label: 'Model' }), problem(kit, () => setup.error.get())),
    setupFooter(
      quietButton({ disabled: setup.busy, onClick: setup.skipModel }, 'Skip'),
      primaryAction({ disabled: () => setup.busy.get() || !setup.model.get(), onClick: setup.saveModel }, 'Next'),
    ),
  )
}
