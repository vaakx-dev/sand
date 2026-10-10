import type { PickerTarget } from '@sand/model-picker/contract'
import { badge, type Pulse, type Sig } from '@sand/dom'
import type { Actions, PanelContext } from './actions'
import { banner, footer, usesDefaults } from './controls'

export const composerTarget = (ctx: PanelContext, actions: Actions, changes: Pulse, problem: Sig<string>): PickerTarget => {
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
      const model = ctx.models.info(settings?.model)
      return [
        ctx.threads.current()?.running && banner('clock', 'A turn is running. Changes apply when it finishes.'),
        problem.get() && banner('alert', problem.get()),
        settings && !usesDefaults(settings, ctx.models.defaults(), model) && footer(settings, actions),
      ]
    },
  }
}
