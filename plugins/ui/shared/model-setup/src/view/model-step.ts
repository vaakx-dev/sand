import type { ModelPicker, PickerTarget } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import type { ModelSetupState } from '../setup'
import { problem, screen } from './layout'

const setupTarget = (picker: ModelPicker, setup: ModelSetupState): PickerTarget => ({
  shown: () => picker.resolve(setup.choice.get()),
  set: setup.choose,
})

export const modelStep = (kit: Kit, setup: ModelSetupState, picker: ModelPicker) => {
  const { primaryAction, quietButton, setupColumn, setupFooter, setupHeading, setupNote } = kit
  return screen(
    kit,
    setup.total,
    2,
    setupHeading('Pick a model'),
    setupNote('You can switch at any time.'),
    setupColumn(div({ class: 'flex min-w-0 flex-col' }, picker.panel(setupTarget(picker, setup), () => {})), problem(kit, () => setup.error.get())),
    setupFooter(
      quietButton({ disabled: setup.busy, onClick: setup.skipModel }, 'Skip'),
      primaryAction({ disabled: () => setup.busy.get() || !setup.choice.get().model, onClick: setup.saveModel }, 'Next'),
    ),
  )
}
