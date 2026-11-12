import type { ModelPicker } from '@sand/model-picker/contract'
import type { Models } from '@sand/web-client/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show } from '@vaakx-dev/vrui'
import type { ModelSetupState } from '../setup'
import { doneStep } from './done-step'
import { modelStep } from './model-step'

const body = (kit: Kit, setup: ModelSetupState, models: Models, picker: ModelPicker) =>
  dynamicChild(setup.step, step => (step === 'model' ? modelStep(kit, setup, picker) : doneStep(kit, setup, models)))

export const setupView = (kit: Kit, setup: ModelSetupState, models: Models, picker: ModelPicker) => {
  const { setupFrame } = kit
  return show(setup.step.map(Boolean), () => setupFrame(body(kit, setup, models, picker)))
}
