import type { Composer } from '@sand/composer/contract'
import type { Route } from '@sand/ui-shell/contract'
import { div, dynamicChild, type Child, type Sig } from '@vaakx-dev/vrui'
import { claims } from './claims'
import type { ChatContext } from './context'
import { threadRoute } from './contract'
import { chatController } from './controller'
import { keptViews } from './kept'
import { claimRoute } from './route/select'

export const threadScreens = (ctx: ChatContext, composer: Sig<Composer | undefined>) => {
  const claim = claims()
  const chats = keptViews(id => chatController(ctx, id))
  ctx.effect(() => chats.clear)
  const dock = () => dynamicChild(composer, found => found?.view() ?? null)

  const screen = (route: Route, look: string, ...children: Child[]) => {
    const node = div({ class: ['flex min-h-0 flex-1 flex-col', look] }, ...children, dock())
    claim(node, () => claimRoute(ctx, route))
    return node
  }

  return {
    thread: (id: string) => screen({ kind: threadRoute, id }, '', chats.view(id)),
    draft: (route: Route) => screen(route, 'justify-center'),
  }
}

export type ThreadScreens = ReturnType<typeof threadScreens>
