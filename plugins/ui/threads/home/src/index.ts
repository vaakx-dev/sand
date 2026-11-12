import { draftPlaces, threadOwners } from '@sand/chat/contract'
import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { jobs, jobsChange } from '@sand/jobs/contract'
import { needs } from '@sand/needs-you/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { kit } from '@sand/ui-kit/contract'
import { settings } from '@sand/settings/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange, turns } from '@sand/web-client/contract'
import { clock, sig, stored } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesModel } from './changes'
import { threadRows, type RowPart } from './contract'
import { chipSources } from './chips'
import { pageSize, threadGroups } from './groups'
import { threadEntries } from './items/items'
import { RowLooks } from './items/looks'
import { chooseDraftPlace, newThread } from './launch/launch'
import { questionNeeds, reviewNeeds, secretNeeds } from './needs'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

export default definePlugin({
  name: 'threads-home',
  description: 'Threads in the sidebar grouped Threads, Working, Snoozed and Settled, newest first; New thread picks a project and opens a new chat; the running, needs-you and ready counts; New thread in Search; threads and projects in Search',
  inject: { kit, threads, turns, shell, wire },
  apply(ctx) {
    const events = pulse(ctx, [projectsChange, threadsChange, threadSelect, pcsChange, draftsChange, jobsChange], [projects, pcs, drafts, jobs, threadOwners])
    const changes = changesModel(ctx, ctx.wire)
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, shell: ctx.shell }
    const limit = sig(pageSize)
    const more = () => limit.update(shown => shown + pageSize)
    const trail = sig<RowPart[]>([])
    const botThreads = stored('sand.threads.bot-threads', true)
    const looks = new RowLooks()
    ctx.watch(settings, found =>
      found?.section({
        page: 'features',
        id: 'bot-threads',
        order: 20,
        render: () =>
          ctx.kit.settingsSection(
            {},
            ctx.kit.settingsRow(
              { title: 'Bot threads in the sidebar', detail: 'List threads bots start with your own, marked with the bot' },
              ctx.kit.toggleSwitch({ on: botThreads, 'aria-label': 'Bot threads in the sidebar', onClick: () => botThreads.update(on => !on) }),
            ),
          ),
      }),
    )
    ctx.provide(threadRows, {
      part(part) {
        trail.update(found => [...found, part].toSorted(byOrder))
        return () => trail.update(found => found.filter(other => other !== part))
      },
    })
    ctx.provide(draftPlaces, { choose: draft => chooseDraftPlace(parts, draft) })
    const groups = owned(ctx, () => events.read(() => threadGroups(threadEntries(parts, { changes, trail: trail.get(), looks }, botThreads.get()), limit.get(), more, () => newThread(parts))))
    const now = owned(ctx, () => clock(1000))
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    for (const source of chipSources({ ...parts, pulse: events, now: () => now.get(), changes })) ctx.effect(() => ctx.shell.chip(source))
    ctx.watch(needs, found => {
      if (!found) return
      const sources = [reviewNeeds({ ...parts, wire: ctx.wire, turns: ctx.turns, changes, pulse: events }), questionNeeds({ ...parts, wire: ctx.wire, turns: ctx.turns, changes, pulse: events }), secretNeeds({ ...parts, wire: ctx.wire, turns: ctx.turns, changes, pulse: events })]
      const stops = sources.map(source => found.source(source))
      return () => stops.forEach(stop => stop())
    })
    ctx.watch(palette, found => found?.source(sessionSource(parts, ctx.kit)))
    wakeTimer(ctx, ctx.threads, events.bump)
  },
})
