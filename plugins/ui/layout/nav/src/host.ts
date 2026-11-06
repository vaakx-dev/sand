import type { NavAction, NavHost } from './contract'
import { pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import type { Context } from 'drydock'
import { pendingActions } from './pending'

export const navHost = (ctx: Context): NavHost => {
  const actions = new Set<NavAction>()
  const changes = pulse(ctx)
  const pending = pendingActions()

  return {
    action(action) {
      actions.add(action)
      changes.schedule()
      return () => {
        actions.delete(action)
        changes.schedule()
      }
    },
    actions: changes.read(() => [...actions].sort(byOrder)),
    busy: pending.busy,
    run: pending.run,
  }
}
