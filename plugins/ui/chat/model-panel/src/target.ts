import type { Picked, PickerTarget } from '@sand/model-picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Pulse } from '@sand/reactive'
import { div, span } from '@vaakx-dev/vrui'
import type { PanelContext } from './context'
import type { ModelTarget } from './contract'

const usesDefaults = (shown: Picked, defaults: Picked) =>
  shown.model === defaults.model && shown.effort === defaults.effort && shown.speed === defaults.speed

const runningNote = ({ callout }: Kit) => div({ class: 'mt-1' }, callout({ tone: 'neutral', icon: 'clock' }, span('A turn is running. Changes apply when it finishes.')))

const footer = ({ secondaryAction }: Kit, reset: () => void) =>
  div({ class: 'mt-1 flex items-center justify-end gap-2 p-1' }, secondaryAction({ size: 'sm', onClick: reset }, 'Reset'))

export const pickerTarget = (ctx: PanelContext, changes: Pulse, target: ModelTarget): PickerTarget => {
  const { kit } = ctx
  const shown = changes.read(() => ctx.modelPicker.resolve(target.settings()))
  const reset = () => target.choose({ model: null, effort: null, speed: null })
  return {
    shown: () => shown.get(),
    set: target.choose,
    key: () => String(changes.version.get()),
    extra: () => [
      target.running?.() && runningNote(kit),
      !usesDefaults(shown.get(), ctx.modelPicker.resolve(ctx.models.defaults())) && footer(kit, reset),
    ],
  }
}
