import { composer } from '@sand/composer/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { owned, pulse } from '@sand/reactive'
import { shell } from '@sand/ui-shell/contract'
import { modelsChange, projects, projectsChange, threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { div, effect, show, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { threadOwners, threadView } from './contract'
import { chatController } from './controller'
import { draftLine } from './draft'
import { threadLive } from './live/status'
import { threadRoutes } from './route'
import { threadLinks } from './links'
import { followSelect } from './route/select'
import { threadViewService } from './service'
import { stage } from './stage'

export default definePlugin({
  name: 'chat',
  description: 'The thread chat: a thread transcript with "Worked for" turns, branches, queued messages and scrolling that keeps your place',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange, threadSelect, projectsChange], [projects, threadOwners])
    const live = threadLive(ctx)
    const { chat, hosts } = owned(ctx, () => {
      const chat = chatController(ctx)
      const { version } = ctx.transcriptParts
      effect(() => {
        version.get()
        untrack(chat.refresh)
      })
      const body = div(
        { class: ['flex min-h-0 flex-1 flex-col', () => (chat.drafting.get() ? 'justify-center' : '')] },
        show(chat.drafting, () => draftLine(ctx, changes)),
        chat.root,
      )
      return { chat, hosts: stage(body, () => ctx.get(composer)?.view()) }
    })
    const followUp = () => {
      changes.version.get()
      const current = ctx.threads.current()
      return current && live(current.id)?.status === 'merged' ? 'Ask a follow-up' : undefined
    }
    ctx.watch(composer, found => {
      if (!found) return
      hosts.restage()
      return found.placeholder(followUp)
    })
    const view = threadViewService(ctx, hosts, live)
    ctx.provide(threadView, view)
    ctx.watch(markdownLinks, found => found?.scheme(threadLinks(ctx.kit, view)))
    ctx.watch(shell, found => found && threadRoutes(ctx, found, hosts, changes))
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
