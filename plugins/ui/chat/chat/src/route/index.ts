import type { Pulse } from '@sand/reactive'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'
import { draftHead } from '../head/draft'
import { breadcrumb } from '../head/view'
import type { ThreadScreens } from '../screens'

export const threadRoutes = (ctx: ChatContext, shell: Shell, screens: ThreadScreens, changes: Pulse): Dispose => {
  const threadScreen = (route: () => Route): Screen => {
    const id = untrack(route).id ?? ''
    return {
      head: () => breadcrumb(ctx, shell, changes, id),
      main: () => screens.thread(id),
    }
  }
  const draftScreen = (route: () => Route): Screen => ({
    head: () => draftHead(ctx, changes),
    main: () => screens.draft(untrack(route)),
  })
  const routes = [shell.route({ kind: threadRoute, render: threadScreen }), shell.route({ kind: draftRoute, lands: true, render: draftScreen })]
  return () => {
    for (const off of routes) void off()
  }
}
