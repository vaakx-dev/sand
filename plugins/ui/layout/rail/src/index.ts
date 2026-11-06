import { layout, layoutChange, place, spaces } from '@sand/layout/contract'
import { pendingActions } from '@sand/nav/contract'
import { owned, pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { byOrder } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { rail, type RailAction } from './contract'
import { railView } from './view'

const litActions = (actions: RailAction[]) => {
  const current = actions.filter(action => action.current?.())
  return new Set(current.filter(action => !current.some(inner => inner.within === action.id)).map(action => action.id))
}

export default definePlugin({
  name: 'rail',
  description: 'The rail at the far left that switches spaces and holds app-wide actions; a tab bar along the bottom on phones',
  inject: { kit, spaces },
  apply(ctx) {
    const actions = sig<RailAction[]>([])
    const lit = owned(ctx, () => derive(() => litActions(actions.get())))
    const pending = pendingActions()
    const narrow = pulse(ctx, [layoutChange], [layout]).read(() => ctx.get(layout)?.state().narrow ?? false)
    ctx.provide(rail, {
      action(action) {
        actions.update(list => [...list, action].sort(byOrder))
        return () => actions.update(list => list.filter(other => other !== action))
      },
    })
    place(ctx, 'rail', () => railView(ctx.kit, { narrow, spaces: ctx.spaces, actions, lit, busy: pending.busy, run: pending.run }))
  },
})
