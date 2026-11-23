import { shell, type Route } from '@sand/ui-shell/contract'
import type { ChatContext } from './context'
import { type PlacedThread, threadRoute, type ThreadPlace, type ThreadView } from './contract'
import type { ThreadScreens } from './screens'

export const threadViewService = (ctx: ChatContext, screens: ThreadScreens): ThreadView => {
  const places = new Set<ThreadPlace>()
  const placed = (thread: string) => [...places].reduce<PlacedThread | undefined>((found, place) => found ?? place(thread), undefined)
  const route = (thread: string): Route => placed(thread)?.route ?? { kind: threadRoute, id: thread }
  const title = (thread: string) => placed(thread)?.title ?? (ctx.threads.get(thread)?.info.title || 'Untitled thread')
  return {
    render: screens.thread,
    route,
    title,
    open: thread => ctx.get(shell)?.open(route(thread)),
    place(place) {
      places.add(place)
      return () => void places.delete(place)
    },
  }
}
