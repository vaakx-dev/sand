import type { NavAction, NavHost } from './contract'
import { pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const pendingActions = () => {
  const pending = sig<ReadonlySet<string>>(new Set())
  const mark = (id: string, on: boolean) =>
    pending.update(current => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  return {
    busy: (id: string) => pending.get().has(id),
    run(action: NavAction) {
      if (pending.get().has(action.id)) return
      const result = action.run()
      if (!(result instanceof Promise)) return
      mark(action.id, true)
      void result.catch(() => {}).finally(() => mark(action.id, false))
    },
  }
}

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
