import type { Models } from '@sand/web-client/contract'
import type { Pulse } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show } from '@vaakx-dev/vrui'
import type { ModelSetupState } from '../setup'
import { doneStep } from './done-step'
import { modelStep } from './model-step'
import { namesStep } from './names-step'

const body = (kit: Kit, setup: ModelSetupState, models: Models, changes: Pulse) =>
  dynamicChild(setup.step, step => {
    if (step === 'model') return modelStep(kit, setup, models, changes)
    if (step === 'names') return namesStep(kit, setup, models, changes)
    return doneStep(kit, setup, models)
  })

export const setupView = (kit: Kit, setup: ModelSetupState, models: Models, changes: Pulse) => {
  const { setupFrame } = kit
  return show(setup.step.map(Boolean), () => setupFrame(body(kit, setup, models, changes)))
}
