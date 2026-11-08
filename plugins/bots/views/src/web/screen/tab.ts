import { botRoute } from '@sand/bots/contract'
import type { Route, Screen } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, effect, span, untrack } from '@vaakx-dev/vrui'
import { statusIcon } from '../marks'
import type { Parts } from '../parts'

export const botTabRoute = 'bot-tab'

export const tabScreen = (parts: Parts, route: () => Route): Screen => {
  const { kit, shell } = parts.ctx
  const { id = '', tab: ref = '' } = untrack(route)
  const live = () => parts.work.get(ref)
  effect(() => {
    if (shell.state() !== 'phone') untrack(() => shell.open({ kind: botRoute, id, tab: ref }, { replace: true }))
  })
  return {
    head: () =>
      span(
        { class: 'flex min-w-0 items-center gap-2' },
        dynamicChild(
          derive(() => live()?.status ?? 'done'),
          status => statusIcon(kit, status),
        ),
        kit.barTitle(() => live()?.title ?? ''),
      ),
    main: () =>
      div(
        { class: 'flex min-h-0 min-w-0 flex-1 flex-col' },
        dynamicChild(
          derive(() => Boolean(parts.work.source(ref))),
          found => (found ? (parts.work.source(ref)?.render(ref) ?? null) : kit.emptyState({ text: 'This work is no longer here.' })),
        ),
      ),
  }
}
