import { composer, type Composer } from '@sand/composer/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { modelTargets } from '@sand/model-panel/contract'
import { pulse } from '@sand/reactive'
import { shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { draftRoute, threadOwners, threadRoute, threadView } from './contract'
import { threadLinks } from './links'
import { threadLive } from './live/status'
import { threadRoutes } from './route'
import { followSelect } from './route/select'
import { threadScreens } from './screens'
import { threadViewService } from './service'

export default definePlugin({
  name: 'chat',
  description: 'The thread chat: a thread transcript with "Worked for" turns, branches, queued messages and scrolling that keeps your place',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange, threadSelect, projectsChange], [projects, threadOwners])
    const live = threadLive(ctx)
    const dock = sig<Composer | undefined>(undefined)
    const screens = threadScreens(ctx, dock)
    const followUp = () => {
      changes.version.get()
      const current = ctx.threads.current()
      return current && live(current.id)?.status === 'merged' ? 'Ask a follow-up' : undefined
    }
    ctx.watch(composer, found => {
      dock.set(found)
      return found?.placeholder(followUp)
    })
    const view = threadViewService(ctx, screens, live)
    ctx.provide(threadView, view)
    ctx.watch(markdownLinks, found => found?.scheme(threadLinks(ctx.kit, view)))
    ctx.watch(shell, found => found && threadRoutes(ctx, found, screens, changes))
    ctx.watch(shell, found =>
      found?.subject(({ kind, id }) => {
        changes.version.get()
        const thread = kind === threadRoute && id ? ctx.threads.get(id) : undefined
        return thread && { session: thread.id, device: thread.device, ...(thread.info.cwd && { cwd: thread.info.cwd }) }
      }),
    )
    ctx.watch(shell, found =>
      found?.subject(({ kind, id }) => {
        changes.version.get()
        const draft = ctx.threads.drafting()
        return kind === draftRoute && draft && draft.id === id ? { session: draft.id, device: draft.device, ...(draft.cwd && { cwd: draft.cwd }), draft: true } : undefined
      }),
    )
    ctx.watch(modelTargets, targets =>
      targets?.source(({ session }) => {
        changes.version.get()
        const found = dock.get()
        return found && ctx.threads.current()?.id === session ? { settings: found.settings, choose: found.choose, running: () => ctx.threads.current()?.running ?? false } : undefined
      }),
    )
    ctx.on(threadSelect, (_, visit) => {
      const found = ctx.get(shell)
      if (found) followSelect(ctx, found, visit)
    })
  },
})
