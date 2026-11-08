import { composer } from '@sand/composer/contract'
import { owned, pulse } from '@sand/reactive'
import { shell } from '@sand/ui-shell/contract'
import { modelsChange, projects, projectsChange, threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { div, dynamicChild, effect, sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { chatController } from './controller'
import { threadRoutes } from './route'
import { followSelect } from './route/select'

export default definePlugin({
  name: 'chat',
  description: 'The thread chat: a thread transcript with "Worked for" turns, branches, queued messages and scrolling that keeps your place',
  inject,
  apply(ctx) {
    const dock = sig<HTMLElement | undefined>(undefined)
    const changes = pulse(ctx, [threadsChange, threadSelect, projectsChange], [projects])
    const { chat, body } = owned(ctx, () => {
      const chat = chatController(ctx)
      const { version } = ctx.transcriptParts
      effect(() => {
        version.get()
        untrack(chat.refresh)
      })
      const body = dynamicChild(dock, view => view ?? null, div({ class: 'flex min-h-0 flex-1 flex-col' }, chat.root))
      return { chat, body }
    })
    ctx.watch(composer, found => {
      dock.set(found?.view())
    })
    ctx.watch(shell, found => found && threadRoutes(ctx, found, body, changes))
    ctx.on(threadChange, id => {
      if (id === ctx.threads.current()?.id) chat.render()
    })
    ctx.on(threadSelect, (_, visit) => {
      chat.render()
      const found = ctx.get(shell)
      if (found) followSelect(ctx, found, visit)
    })
    ctx.on(threadsChange, chat.forget)
    ctx.on(modelsChange, chat.refresh)
  },
})
