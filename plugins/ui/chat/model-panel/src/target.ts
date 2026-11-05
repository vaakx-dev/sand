import type { Picked, PickerTarget } from '@sand/model-picker/contract'
import type { CalloutLook, Kit } from '@sand/ui-kit/contract'
import type { Pulse } from '@sand/reactive'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import type { Actions } from './actions'
import type { PanelContext } from './context'
import type { ShownState } from './shown'

const banner = ({ callout }: Kit, look: CalloutLook, text: string) => div({ class: 'mt-1' }, callout(look, span(text)))

const usesDefaults = (shown: Picked, defaults: Picked) =>
  shown.model === defaults.model && shown.effort === defaults.effort && shown.speed === defaults.speed

const footer = ({ secondaryAction }: Kit, actions: Actions) =>
  div({ class: 'mt-1 flex items-center justify-end gap-2 p-1' }, secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'))

export const composerTarget = (ctx: PanelContext, actions: Actions, changes: Pulse, problem: Sig<string>, shownState: ShownState): PickerTarget => {
  const { kit } = ctx
  const { badge } = kit
  const state = changes.read(shownState)
  const shown = () => state.get()?.next ?? state.get()?.current
  return {
    shown,
    set: actions.set,
    key: () => `${changes.version.get()}:${problem.get()}`,
    badge: model => {
      const now = state.get()
      return now?.next && model.id === now.next.model && model.id !== now.current.model ? badge('neutral', 'Next') : null
    },
    extra: () => {
      const settings = shown()
      return [
        ctx.threads.current()?.running && banner(kit, { tone: 'neutral', icon: 'clock' }, 'A turn is running. Changes apply when it finishes.'),
        problem.get() && banner(kit, 'danger', problem.get()),
        settings && !usesDefaults(settings, ctx.modelPicker.resolve(ctx.models.defaults())) && footer(kit, actions),
      ]
    },
  }
}
