import type { NavHost } from './contract'
import { pulse } from '@sand/kit/web'
import type { NavAction, NavList } from '@sand/protocol'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const byOrder = <T extends { order?: number }>(items: T[]) => [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

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
  const lists = new Set<NavList>()
  const actions = new Set<NavAction>()
  const changes = pulse(ctx)
  const pending = pendingActions()

  return {
    list(list) {
      lists.add(list)
      changes.schedule()
      return {
        update(patch) {
          Object.assign(list, patch)
          changes.schedule()
        },
        dispose() {
          lists.delete(list)
          changes.schedule()
        },
      }
    },
    action(action) {
      actions.add(action)
      changes.schedule()
      return () => {
        actions.delete(action)
        changes.schedule()
      }
    },
    lists: changes.read(() => byOrder([...lists])),
    actions: changes.read(() => byOrder([...actions])),
    busy: pending.busy,
    run: pending.run,
  }
}
