import type { EffectiveSettings } from '@sand/model/contract'
import type { Picked, PickerTarget } from '@sand/model-picker/contract'
import type { Pulse } from '@sand/kit/web'
import type { CalloutLook, Kit } from '@sand/ui-kit/contract'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import type { Actions, PanelContext } from './actions'

const banner = ({ callout }: Kit, look: CalloutLook, text: string) => div({ class: 'mx-1 mt-2' }, callout(look, span(text)))

const usesDefaults = (shown: EffectiveSettings, defaults: Picked) =>
  shown.model === defaults.model && shown.effort === defaults.effort && shown.speed === defaults.speed

const footer = ({ primaryAction, secondaryAction }: Kit, shown: EffectiveSettings, actions: Actions) =>
  div(
    { class: 'mx-1 mt-2 flex items-center justify-end gap-2 border-t border-solid border-neutral-700 px-2 pt-2 pb-1' },
    secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'),
    primaryAction({ size: 'sm', onClick: () => actions.makeDefault(shown) }, 'Make default'),
  )

export const composerTarget = (ctx: PanelContext, actions: Actions, changes: Pulse, problem: Sig<string>): PickerTarget => {
  const { kit } = ctx
  const { badge } = kit
  const state = changes.read(() => ctx.models.state())
  const shown = () => state.get()?.next ?? state.get()?.current
  return {
    shown,
    set: actions.set,
    key: () => `${changes.version.get()}:${problem.get()}`,
    badge: model => {
      const now = state.get()
      return now?.next && model.id === now.next.model && model.id !== now.current.model ? badge('warning', 'Next') : null
    },
    extra: () => {
      const settings = shown()
      return [
        ctx.threads.current()?.running && banner(kit, { tone: 'warning', icon: 'clock' }, 'A turn is running. Changes apply when it finishes.'),
        problem.get() && banner(kit, 'danger', problem.get()),
        settings && !usesDefaults(settings, ctx.modelPicker.resolve(ctx.models.defaults())) && footer(kit, settings, actions),
      ]
    },
  }
}
