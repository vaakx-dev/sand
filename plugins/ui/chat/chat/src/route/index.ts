import type { Pulse } from '@sand/reactive'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'
import { breadcrumb } from '../head/view'
import type { ThreadScreens } from '../screens'
import { clearOnHome } from './select'

export const threadRoutes = (ctx: ChatContext, shell: Shell, screens: ThreadScreens, changes: Pulse): Dispose => {
  const threadScreen = (route: () => Route): Screen => {
    const id = untrack(route).id ?? ''
    return {
      head: () => breadcrumb(ctx, shell, changes, id),
      main: () => screens.thread(id),
    }
  }
  const draftScreen = (route: () => Route): Screen => ({
    head: () => null,
    main: () => screens.draft(untrack(route)),
  })
  let first = true
  const stop = effect(() => {
    const route = shell.current()
    untrack(() => clearOnHome(ctx, route, first))
    first = false
  })
  const routes = [shell.route({ kind: threadRoute, render: threadScreen }), shell.route({ kind: draftRoute, render: draftScreen })]
  return () => {
    stop()
    for (const off of routes) void off()
  }
}
