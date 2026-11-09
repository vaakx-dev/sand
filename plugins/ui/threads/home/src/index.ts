import { threadOwners } from '@sand/chat/contract'
import { draftsChange, drafts } from '@sand/composer/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { kit } from '@sand/ui-kit/contract'
import { settings } from '@sand/settings/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, projectsChange, threadSelect, threads, threadsChange } from '@sand/web-client/contract'
import { clock, sig, stored } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changesModel } from './changes'
import { threadRows, type RowPart } from './contract'
import { chipSources } from './chips'
import { pageSize, threadGroups } from './groups'
import { threadEntries } from './items/items'
import { isNewChat, launch, newChat } from './launch/launch'
import { sessionSource } from './palette/source'
import { wakeTimer } from './snooze/wake'

export default definePlugin({
  name: 'threads-home',
  description: 'Threads in the sidebar grouped Active, Working, Snoozed and Settled, newest first; New chat through a list of projects in Search; Home with the launch composer; the Waiting, Ready and Working chips; threads and projects in Search',
  inject: { kit, threads, shell, wire, pcs },
  apply(ctx) {
    const events = pulse(ctx, [projectsChange, threadsChange, threadSelect, pcsChange, draftsChange], [projects, pcs, drafts, threadOwners])
    const changes = owned(ctx, () => changesModel(ctx, ctx.wire, ctx.pcs))
    const parts = { ctx, kit: ctx.kit, threads: ctx.threads, shell: ctx.shell }
    const limit = sig(pageSize)
    const more = () => limit.update(shown => shown + pageSize)
    const trail = sig<RowPart[]>([])
    const botThreads = stored('sand.threads.bot-threads', true)
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
    const groups = owned(ctx, () => events.read(() => threadGroups(threadEntries(parts, { changes, trail: trail.get() }, botThreads.get()), limit.get(), more)))
    const now = owned(ctx, () => clock(1000))
    ctx.effect(() => ctx.shell.section({ id: 'threads', order: 20, groups: () => groups.get() }))
    for (const source of chipSources({ ...parts, pulse: events, now: () => now.get(), changes })) ctx.effect(() => ctx.shell.chip(source))
    const launched = { ...parts, pulse: events }
    launch(launched)
    ctx.effect(() => ctx.shell.nav({ id: 'new-chat', label: 'New chat', icon: 'compose', order: -10, run: () => newChat(launched), current: () => isNewChat(launched) }))
    ctx.watch(palette, found => found?.source(sessionSource(launched, ctx.kit)))
    wakeTimer(ctx, ctx.threads, events.bump)
  },
})
