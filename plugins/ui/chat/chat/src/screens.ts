import type { Composer } from '@sand/composer/contract'
import type { Route } from '@sand/ui-shell/contract'
import { threadChange, type Thread } from '@sand/web-client/contract'
import { div, dynamicChild, type Child, type Sig } from '@vaakx-dev/vrui'
import { claims } from './claims'
import type { ChatContext } from './context'
import { threadRoute } from './contract'
import { chatController } from './controller'
import { keptViews } from './kept'
import { claimRoute } from './route/select'

const heldFromDevice = (thread: Thread) => Boolean(thread.cached) && !thread.loaded && thread.entries.size > 0

export const threadScreens = (ctx: ChatContext, composer: Sig<Composer | undefined>) => {
  const claim = claims()
  const chats = keptViews(id => chatController(ctx, id))
  ctx.effect(() => chats.clear)
  ctx.on(threadChange, id => {
    const thread = ctx.threads.get(id)
    if (thread && heldFromDevice(thread)) chats.prepare(id)
  })
  const dock = () => dynamicChild(composer, found => found?.view() ?? null)

  const screen = (route: Route, look: string, ...children: Child[]) => {
    const node = div({ class: ['flex min-h-0 flex-1 flex-col', look] }, ...children, dock())
    claim(node, () => claimRoute(ctx, route))
    return node
  }

  const thread = (id: string) => {
    if (!ctx.threads.get(id)?.loaded) void ctx.threads.load(id)
    return screen({ kind: threadRoute, id }, '', chats.view(id))
  }

  return {
    thread,
    draft: (route: Route) => screen(route, 'justify-center'),
  }
}

export type ThreadScreens = ReturnType<typeof threadScreens>
