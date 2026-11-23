import type { Pulse } from '@sand/reactive'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { div, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute, type ThreadView } from '../contract'
import { draftHead } from '../head/draft'
import { breadcrumb } from '../head/view'
import type { ThreadScreens } from '../screens'

const movedScreen = (shell: Shell, to: Route): Screen => ({
  head: () => null,
  main: () => div({ onMount: () => shell.open(to, { replace: true }) }),
})

interface RouteParts {
  screens: ThreadScreens
  view: ThreadView
  changes: Pulse
}

export const threadRoutes = (ctx: ChatContext, shell: Shell, { screens, view, changes }: RouteParts): Dispose => {
  const threadScreen = (route: () => Route): Screen => {
    const id = untrack(route).id ?? ''
    const shown = view.route(id)
    if (shown.kind !== threadRoute) return movedScreen(shell, shown)
    return {
      head: () => breadcrumb(ctx, { shell, view, changes }, id),
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
