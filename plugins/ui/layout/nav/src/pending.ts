import { sig } from '@vaakx-dev/vrui'
import type { NavAction } from './contract'

export const pendingActions = () => {
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
