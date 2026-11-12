import { composer, type Composer } from '@sand/composer/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { modelTargets } from '@sand/model-panel/contract'
import { pulse } from '@sand/reactive'
import { shell } from '@sand/ui-shell/contract'
import { draftStarted, projects, projectsChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { draftRoute, threadOwners, threadRoute, threadView } from './contract'
import { threadLinks } from './links'
import { mergedCheck } from './live/merged'
import { threadRoutes } from './route'
import { followStart } from './route/select'
import { threadScreens } from './screens'
import { threadViewService } from './service'

export default definePlugin({
  name: 'chat',
  description: 'The thread chat: a thread transcript with "Worked for" turns, branches, queued messages and scrolling that keeps your place',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange, threadSelect, projectsChange], [projects, threadOwners])
    const merged = mergedCheck(ctx)
    const dock = sig<Composer | undefined>(undefined)
    const screens = threadScreens(ctx, dock)
    const placeholder = () => {
      changes.version.get()
      const current = ctx.threads.current()
      return current && merged(current) ? 'Ask a follow-up' : undefined
    }
    ctx.watch(composer, found => {
      dock.set(found)
      return found?.placeholder(placeholder)
    })
    const view = threadViewService(ctx, screens)
    ctx.provide(threadView, view)
    ctx.watch(markdownLinks, found => found?.scheme(threadLinks(ctx.kit, view)))
    ctx.watch(shell, found => found && threadRoutes(ctx, found, screens, changes))
    ctx.watch(shell, found =>
      found?.subject(({ kind, id }) => {
        changes.version.get()
        const thread = kind === threadRoute && id ? ctx.threads.get(id) : undefined
        return thread && { session: thread.id, owner: 'thread', device: thread.device, ...(thread.info.cwd && { cwd: thread.info.cwd }) }
      }),
    )
    ctx.watch(shell, found =>
      found?.subject(({ kind, id }) => {
        changes.version.get()
        const draft = ctx.threads.drafting()
        return kind === draftRoute && draft && draft.id === id ? { session: draft.id, owner: 'thread', device: draft.device, ...(draft.cwd && { cwd: draft.cwd }), draft: true } : undefined
      }),
    )
    ctx.watch(modelTargets, targets =>
      targets?.source(({ session }) => {
        changes.version.get()
        const found = dock.get()
        const open = ctx.threads.current()?.id ?? ctx.threads.drafting()?.id
        return found && open === session ? { settings: found.settings, choose: found.choose, running: () => ctx.threads.current()?.running ?? false } : undefined
      }),
    )
    ctx.on(draftStarted, (draft, thread) => {
      const found = ctx.get(shell)
      if (found) followStart(found, draft, thread)
    })
  },
})
