import type { Pulse } from '@sand/reactive'
import type { PanelContext } from './context'
import type { ModelButton, ModelTarget } from './contract'
import { pickerTarget } from './target'

const rowView = (ctx: PanelContext, changes: Pulse, target: ModelTarget, opened: boolean, opener: (open: () => void) => () => void) =>
  ctx.modelPicker.button(pickerTarget(ctx, changes, target), { label: 'Model', look: 'row', opened, opener })

const added = <T>(all: T[], item: T) => {
  all.push(item)
  return () => {
    all.splice(all.indexOf(item), 1)
  }
}

export const modelButton = (ctx: PanelContext, changes: Pulse): ModelButton => {
  const live: (() => void)[] = []
  const reveals: (() => void)[] = []
  let wanted = false
  return {
    view(target) {
      const node = rowView(ctx, changes, target, wanted, open => added(live, open))
      wanted = false
      return node
    },
    open() {
      const last = live.at(-1)
      if (last) {
        last()
        return true
      }
      wanted = true
      for (const show of reveals) show()
      const shown = !wanted
      wanted = false
      return shown
    },
    reveal: show => added(reveals, show),
  }
}
