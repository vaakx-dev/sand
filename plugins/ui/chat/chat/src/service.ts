import { shell, type Route } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'
import { threadRoute, type ThreadPlace, type ThreadView } from './contract'
import type { ThreadScreens } from './screens'

export const threadViewService = (ctx: Context, screens: ThreadScreens): ThreadView => {
  const places = new Set<ThreadPlace>()
  const route = (thread: string): Route => [...places].reduce<Route | undefined>((found, place) => found ?? place(thread), undefined) ?? { kind: threadRoute, id: thread }
  return {
    render: screens.thread,
    route,
    open: thread => ctx.get(shell)?.open(route(thread)),
    place(place) {
      places.add(place)
      return () => void places.delete(place)
    },
  }
}
