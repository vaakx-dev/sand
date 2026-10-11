import type { Models } from '@sand/web-client/contract'
import { primaryAction, quietButton, setupColumn, setupFooter, setupHeading, setupNote, type Pulse } from '@sand/dom'
import type { ModelSetupState } from '../setup'
import { problem, screen } from './layout'
import { modelList } from './models'

export const modelStep = (setup: ModelSetupState, models: Models, changes: Pulse) =>
  screen(
    2,
    setupHeading('Pick a model for new threads'),
    setupNote('You can switch per thread at any time.'),
    setupColumn(modelList(models, changes, setup.model, 'Model for new threads'), problem(() => setup.error.get())),
    setupFooter(
      quietButton({ onClick: setup.skipModel }, 'Skip'),
      primaryAction({ disabled: () => setup.busy.get() || !setup.model.get(), onClick: setup.saveModel }, 'Next'),
    ),
  )
