import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange } from '@sand/devices-contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { homeRoute, shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threads, threadsChange } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { pageSize, threadGroups } from './groups'
import { homeScreen } from './home'
import { threadEntries } from './items/items'
import { newThreadPage, openDraft } from './palette/projects'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

export default definePlugin({
  name: 'threads-home',
  description: 'Threads in the sidebar, pinned first, then by day, then snoozed; New chat, the home screen, and threads and projects in the palette',
  inject: { kit, threads, shell },
  apply(ctx) {
    const changes = pulse(ctx, [projectsChange, threadsChange, pcsChange, draftsChange, jobsChange], [projects, pcs, drafts, jobs])
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, shell: ctx.shell }
    const limit = sig(pageSize)
    const more = () => limit.update(shown => shown + pageSize)
    const groups = owned(ctx, () => changes.read(() => threadGroups(threadEntries(parts), limit.get(), more)))
    const create = () => {
      const found = ctx.get(palette)
      if (found) return found.open(newThreadPage(ctx, ctx.threads))
      const here = ctx.threads.drafting() ?? { cwd: ctx.threads.cwd(), device: ctx.threads.device() }
      void openDraft(ctx, ctx.threads, here.cwd, here.device)
    }
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    ctx.effect(() => ctx.shell.nav({ id: 'new-chat', label: 'New chat', icon: 'compose', order: -10, run: create }))
    ctx.effect(() => ctx.shell.route({ kind: homeRoute, render: () => homeScreen(ctx.kit, create) }))
    ctx.watch(palette, found => found?.source(sessionSource(ctx, ctx.kit, ctx.threads)))
    wakeTimer(ctx, ctx.threads, changes.bump)
  },
})
