import { draftPlaces } from '@sand/chat/contract'
import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { needs } from '@sand/needs-you/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange, type Thread } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesModel } from './changes'
import { threadRows, type RowPart } from './contract'
import { pageSize, threadGroups } from './groups'
import { threadEntries, threadRow } from './items/items'
import { RowLooks } from './items/looks'
import { chooseDraftPlace, newThread } from './launch/launch'
import { threadLinks } from './links'
import { conflictNeeds, reviewNeeds, secretNeeds } from './needs'
import { openThread } from './open'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

export default definePlugin({
  name: 'threads-home',
  description: "Threads in the sidebar grouped Threads, Working, Snoozed and Archived, newest first; New thread opens a new chat in the last project, and its header picks another; threads waiting on a sign-in, unmerged or ready to merge in Needs you; New thread in Search; threads and projects in Search; thread links in chats drawn as their sidebar row",
  inject: { kit, threads, projects, shell, wire },
  apply(ctx) {
    const events = pulse(ctx, [projectsChange, threadsChange, threadSelect, pcsChange, draftsChange, jobsChange], [projects, pcs, drafts, jobs])
    const changes = changesModel(ctx, ctx.wire)
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, projects: ctx.projects, shell: ctx.shell }
    const limit = sig(pageSize)
    const more = () => limit.update(shown => shown + pageSize)
    const trail = sig<RowPart[]>([])
    const looks = new RowLooks()
    const sources = () => ({ changes, trail: trail.get(), looks })
    const entries = owned(ctx, () => events.read(() => threadEntries(parts, sources())))
    const listed = owned(ctx, () => derive(() => new Map(entries.get().map(entry => [entry.row.id, entry.row]))))
    const rowOf = (thread: Thread) => listed.get().get(thread.id) ?? threadRow(parts, thread, sources())
    const row = (id: string) => {
      events.version.get()
      const thread = ctx.threads.get(id)
      return thread && rowOf(thread)
    }
    ctx.provide(threadRows, {
      part(part) {
        trail.update(found => [...found, part].toSorted(byOrder))
        return () => trail.update(found => found.filter(other => other !== part))
      },
      row,
    })
    ctx.provide(draftPlaces, { choose: draft => chooseDraftPlace(parts, draft) })
    const groups = owned(ctx, () => derive(() => threadGroups({ entries: entries.get(), known: ctx.threads.known(), limit: limit.get(), more, start: () => newThread(parts) })))
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    ctx.watch(markdownLinks, found => found?.scheme(threadLinks({ kit: ctx.kit, shell: ctx.shell, row, open: thread => openThread(ctx, ctx.shell, thread) })))
    ctx.watch(needs, found => {
      if (!found) return
      const needParts = { ...parts, changes, pulse: events }
      const sources = [reviewNeeds(needParts), conflictNeeds(needParts), secretNeeds(needParts)]
      const stops = sources.map(source => found.source(source))
      return () => stops.forEach(stop => stop())
    })
    ctx.watch(palette, found => found?.source(sessionSource({ ...parts, rowOf }, ctx.kit)))
    wakeTimer(ctx, ctx.threads, events.bump)
  },
})
