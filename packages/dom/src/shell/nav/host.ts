import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { pulse } from '../../reactive/owned'
import type { Nav, NavAction, NavList } from './types'

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

export const navHost = (ctx: Context) => {
  const lists = new Set<NavList>()
  const actions = new Set<NavAction>()
  const changes = pulse(ctx)
  const pending = pendingActions()

  const nav: Nav = {
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
  }

  return {
    nav,
    changes,
    lists: changes.read(() => byOrder([...lists])),
    actions: changes.read(() => byOrder([...actions])),
    busy: pending.busy,
    run: pending.run,
  }
}

export const closeDrawer = (ctx: Context) => {
  if (ctx.layout?.state().narrow) ctx.layout.toggle('side', false)
}

export type NavHost = ReturnType<typeof navHost>
