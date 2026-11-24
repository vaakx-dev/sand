import { draftPlaces } from '@sand/chat/contract'
import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { markdownLinks } from '@sand/markdown/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange, type Thread } from '@sand/web-client/contract'
import { clock, derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesModel } from './changes'
import { threadRows, type RowPart } from './contract'
import { listGroups, pageSize } from './groups'
import { settleDays, settleItem, settleRow } from './settle'
import { settings } from '@sand/settings/contract'
import { threadEntries, threadRow } from './items/items'
import { RowLooks } from './items/looks'
import { chooseDraftPlace, newThread } from './launch/launch'
import { threadLinks } from './links'
import { openThread } from './open'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

const HOUR_MS = 3_600_000

export default definePlugin({
  name: 'threads-home',
  description: "Threads in the sidebar grouped Threads, Working, Snoozed, Settled and Archived, newest first, with the one setting for when threads and bots settle; New thread opens a new chat in the last project, and its header picks another; New thread in Search; threads and projects in Search; thread links in chats drawn as their sidebar row",
  inject: { kit, threads, projects, shell, wire },
  apply(ctx) {
    const events = pulse(ctx, [projectsChange, threadsChange, threadSelect, pcsChange, draftsChange, jobsChange], [projects, pcs, drafts, jobs])
    const changes = changesModel(ctx)
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, projects: ctx.projects, shell: ctx.shell }
    const days = settleDays(ctx)
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
      settleDays: () => days.get(),
    })
    ctx.provide(draftPlaces, { choose: draft => chooseDraftPlace(parts, draft) })
    const hour = owned(ctx, () => clock(HOUR_MS))
    const groups = owned(ctx, () =>
      derive(() =>
        listGroups({
          id: 'active',
          label: 'Threads',
          entries: entries.get(),
          settleDays: days.get(),
          now: hour.get(),
          action: { label: 'New thread', icon: 'plus', run: () => newThread(parts) },
          ...(ctx.threads.known() && { empty: 'No threads yet.' }),
          archived: { limit: limit.get(), more },
        }),
      ),
    )
    ctx.watch(settings, found => found?.section({ page: 'projects', id: 'settle', order: 5, items: [settleItem], render: () => settleRow(ctx, days) }))
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    ctx.watch(markdownLinks, found => found?.scheme(threadLinks({ kit: ctx.kit, shell: ctx.shell, row, open: thread => openThread(ctx, ctx.shell, thread) })))
    ctx.watch(palette, found => found?.source(sessionSource({ ...parts, rowOf }, ctx.kit)))
    wakeTimer(ctx, ctx.threads, events.bump)
  },
})
