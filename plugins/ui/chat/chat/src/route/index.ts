import type { Pulse } from '@sand/reactive'
import type { Route, Screen, Shell } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, effect, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'
import { breadcrumb } from '../head/view'
import { same, selectRoute } from './select'

const adopt = (shell: Shell, route: () => Route, body: HTMLElement) =>
  dynamicChild(
    derive(() => same(shell.current(), route())),
    shown => (shown ? body : null),
    div({ class: 'flex min-h-0 flex-1 flex-col' }),
  )

export const threadRoutes = (ctx: ChatContext, shell: Shell, body: HTMLElement, changes: Pulse): Dispose => {
  const open = (thread: string) => shell.open({ kind: threadRoute, id: thread })
  const screen = (route: () => Route): Screen => {
    const { kind, id } = untrack(route)
    return {
      head: () => breadcrumb(ctx, changes, kind === threadRoute ? id : undefined, open),
      main: () => adopt(shell, route, body),
    }
  }
  let first = true
  const stop = effect(() => {
    const route = shell.current()
    untrack(() => selectRoute(ctx, route, first))
    first = false
  })
  const routes = [threadRoute, draftRoute].map(kind => shell.route({ kind, render: screen }))
  return () => {
    stop()
    for (const off of routes) void off()
  }
}
