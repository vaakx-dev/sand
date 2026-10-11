import type { Models } from '@sand/web-client/contract'
import { dynamicChild, setupFrame, show, type Pulse } from '@sand/dom'
import type { ModelSetupState } from '../setup'
import { doneStep } from './done-step'
import { modelStep } from './model-step'
import { namesStep } from './names-step'

const body = (setup: ModelSetupState, models: Models, changes: Pulse) =>
  dynamicChild(setup.step, step => {
    if (step === 'model') return modelStep(setup, models, changes)
    if (step === 'names') return namesStep(setup, models, changes)
    return doneStep(setup, models)
  })

export const setupView = (setup: ModelSetupState, models: Models, changes: Pulse) => show(setup.step.map(Boolean), () => setupFrame(body(setup, models, changes)))
