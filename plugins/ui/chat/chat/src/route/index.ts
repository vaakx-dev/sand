import type { Pulse } from '@sand/reactive'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'
import { breadcrumb } from '../head/view'
import type { Stage } from '../stage'
import { claimRoute, clearOnHome } from './select'

export const threadRoutes = (ctx: ChatContext, shell: Shell, stage: Stage, changes: Pulse): Dispose => {
  const screen = (route: () => Route): Screen => {
    const shown = untrack(route)
    return {
      head: () => breadcrumb(ctx, shell, changes, shown.kind === threadRoute ? shown.id : undefined),
      main: () => stage.host(() => claimRoute(ctx, shown)),
    }
  }
  let first = true
  const stop = effect(() => {
    const route = shell.current()
    untrack(() => clearOnHome(ctx, route, first))
    first = false
  })
  const routes = [threadRoute, draftRoute].map(kind => shell.route({ kind, render: screen }))
  return () => {
    stop()
    for (const off of routes) void off()
  }
}
