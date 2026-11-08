import { threadOwners } from '@sand/chat/contract'
import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { kit } from '@sand/ui-kit/contract'
import { homeRoute, shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { clock, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesModel } from './changes'
import { threadRows, type RowPart } from './contract'
import { chipSources } from './chips'
import { pageSize, threadGroups } from './groups'
import { threadEntries } from './items/items'
import { launch, newChat } from './launch/launch'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

export default definePlugin({
  name: 'threads-home',
  description: 'Threads in the sidebar, pinned first, then by day, then snoozed; Home with the launch composer and its project picker; the Waiting, Ready and Working chips; threads and projects in Search',
  inject: { kit, threads, shell, wire, pcs },
  apply(ctx) {
    const events = pulse(ctx, [projectsChange, threadsChange, threadSelect, pcsChange, draftsChange, jobsChange], [projects, pcs, drafts, jobs, threadOwners])
    const changes = owned(ctx, () => changesModel(ctx, ctx.wire, ctx.pcs))
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, shell: ctx.shell }
    const limit = sig(pageSize)
    const more = () => limit.update(shown => shown + pageSize)
    const trail = sig<RowPart[]>([])
    ctx.provide(threadRows, {
      part(part) {
        trail.update(found => [...found, part].toSorted(byOrder))
        return () => trail.update(found => found.filter(other => other !== part))
      },
    })
    const groups = owned(ctx, () => events.read(() => threadGroups(threadEntries(parts, { changes, trail: trail.get() }), limit.get(), more)))
    const now = owned(ctx, () => clock(1000))
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    for (const source of chipSources({ ...parts, pulse: events, now: () => now.get(), changes })) ctx.effect(() => ctx.shell.chip(source))
    const launched = { ...parts, pulse: events }
    launch(launched)
    ctx.effect(() => ctx.shell.nav({ id: 'new-chat', label: 'New chat', icon: 'compose', order: -10, run: () => newChat(launched), current: () => ctx.shell.state() !== 'phone' && ctx.shell.current().kind === homeRoute }))
    ctx.watch(palette, found => found?.source(sessionSource(ctx, ctx.kit, ctx.shell, ctx.threads)))
    wakeTimer(ctx, ctx.threads, events.bump)
  },
})
