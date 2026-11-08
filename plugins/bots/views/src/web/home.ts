import { botRoute } from '@sand/bots/contract'
import { homeRoute, type Screen } from '@sand/ui-shell/contract'
import { div, effect, untrack } from '@vaakx-dev/vrui'
import type { Parts } from './parts'

export const homeScreen = (parts: Parts): Screen => {
  const { kit, shell } = parts.ctx
  effect(() => {
    const first = parts.store.bots.get()?.[0]
    if (first && shell.state() !== 'phone' && shell.current().kind === homeRoute) untrack(() => shell.open({ kind: botRoute, id: first.id }, { replace: true }))
  })
  return {
    head: () => kit.headTitle(1, 'Bots'),
    main: () =>
      div(
        { class: 'flex min-h-0 flex-1 flex-col items-center justify-center' },
        kit.emptyBlock({
          icon: 'bot',
          title: 'No bots yet',
          text: 'A bot looks after something for you, such as a project or a daily check, and starts the work it needs.',
          action: kit.primaryAction({ onClick: parts.create }, 'Create a bot'),
        }),
      ),
  }
}
