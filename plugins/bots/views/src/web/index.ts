import { advanced } from '@sand/advanced/contract'
import {
  botAutomations,
  botName,
  botProfile,
  botRoster,
  botRoute,
  botViews,
  changeEntry,
  morningEntry,
  runEntry,
  type BotAutomationSource,
  type BotProfileSection,
  type ChangeEntry,
  type MorningEntry,
} from '@sand/bots/contract'
import { threadView } from '@sand/chat/contract'
import { threadRows, wakeTimer } from '@sand/threads-home/contract'
import { needs } from '@sand/needs-you/contract'
import { palette, visitsOf, type PaletteItem } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { transcript } from '@sand/transcript/contract'
import { joinDisposers } from '@sand/util'
import { projects, projectsChange } from '@sand/web-client/contract'
import { clock, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { changeNote } from './chat/change'
import { botChats } from './chat/chats'
import { inject } from './context'
import { openNewBot } from './create/sheet'
import { morningNote } from './jobs/morning'
import { runNote } from './jobs/run'
import { type BotView, projectNames, type Parts } from './parts'
import { openProfile } from './profile/sheet'
import { registry } from './registry'
import { botScreen } from './screen/bot'
import { botsGroups } from './sidebar'
import { botStore } from './store'
import { botNeeds } from './needs'

const HOUR_MS = 3_600_000

const VIEWS: BotView[] = ['jobs', 'chat']

const viewOf = (tab: string | undefined) => VIEWS.find(view => view === tab)

export default definePlugin({
  name: 'bot-views',
  description: "Bots in the sidebar grouped like threads: active, Working, Snoozed and Settled; each bot's screen with its jobs and its chat; its profile and New bot; bots waiting on you in Needs you",
  inject,
  apply(ctx) {
    const sections = registry<BotProfileSection>()
    const automationSources = registry<BotAutomationSource>()
    const known = pulse(ctx, [projectsChange], [projects])
    const chats = botChats(ctx)
    const parts: Parts = {
      ctx,
      store: botStore(ctx),
      toasts: toastsOf(ctx),
      projects: owned(ctx, () => known.read(() => [...ctx.projects.groups(), ...ctx.projects.archived()])),
      shown(project) {
        known.version.get()
        return ctx.projects.shown({ project })
      },
      advanced: owned(ctx, () => pulse(ctx, [], [advanced]).read(() => ctx.get(advanced)?.on() ?? false)),
      threadView: owned(ctx, () => pulse(ctx, [], [threadView]).read(() => ctx.get(threadView))),
      threadRows: owned(ctx, () => pulse(ctx, [], [threadRows]).read(() => ctx.get(threadRows))),
      chat: bot => chats.thread(bot),
      sections,
      automationSources,
      open(bot, view) {
        ctx.shell.open({ kind: botRoute, id: bot, ...(view && { tab: view }) })
      },
      showJob(bot, job) {
        parts.open(bot, 'jobs')
        document.querySelector(`[data-job="${CSS.escape(job)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
      profile: bot => openProfile(parts, bot),
      create: () => openNewBot(parts),
    }

    ctx.provide(botViews, { open: (bot, tab) => parts.open(bot, viewOf(tab)) })
    ctx.provide(botRoster, { list: () => parts.store.bots.get(), find: parts.store.find })
    ctx.provide(botProfile, { section: sections.add })
    ctx.provide(botAutomations, { source: automationSources.add })

    const hour = owned(ctx, () => clock(HOUR_MS))
    const woke = sig(0)
    wakeTimer(ctx, ctx.threads, () => woke.update(count => count + 1))
    ctx.effect(() =>
      ctx.shell.section({
        id: 'bots',
        order: 10,
        groups: () => {
          woke.get()
          return botsGroups(parts, hour.get())
        },
      }),
    )
    ctx.effect(() => ctx.shell.route({ kind: botRoute, render: route => botScreen(parts, route) }))
    ctx.watch(needs, found => found?.source(botNeeds(parts)))
    ctx.effect(() =>
      ctx.shell.subject(({ kind, id }) => {
        const bot = kind === botRoute && id ? parts.store.find(id) : undefined
        if (!bot) return undefined
        const chat = chats.thread(bot.id)
        return { session: bot.id, owner: 'bot', device: chat?.device ?? ctx.threads.device(), cwd: chat?.info.cwd ?? bot.folder }
      }),
    )
    ctx.watch(threadView, found =>
      found?.place(thread => {
        const bot = parts.store.find(thread)
        return bot && { route: { kind: botRoute, id: bot.id, tab: 'chat' }, title: botName(bot) }
      }),
    )

    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          found.entry(changeEntry, entry => changeNote(ctx.kit, entry.data as ChangeEntry)),
          found.entry(runEntry, (entry, bot) => runNote(ctx.kit, entry, () => chats.path(bot))),
          found.entry(morningEntry, (entry, bot) => morningNote(ctx.kit, (entry.data as MorningEntry).lines, job => parts.showJob(bot, job))),
        ),
    )
    ctx.watch(palette, found =>
      found?.source({
        id: 'bots',
        order: 5,
        items: query =>
          query.startsWith('/')
            ? []
            : [
                ...(parts.store.bots.get() ?? []).map<PaletteItem>(bot => ({
                  id: `bot:${bot.id}`,
                  group: 'Bots',
                  face: { id: bot.id, tint: bot.color },
                  visits: visitsOf({ kind: botRoute, id: bot.id }),
                  label: botName(bot),
                  detail: projectNames(parts, bot.projects),
                  search: bot.jobs.map(job => job.title).join(' '),
                  run: () => parts.open(bot.id),
                })),
                { id: 'bot:new', group: 'Bots', icon: 'plus', label: 'New bot…', run: () => parts.create() },
              ],
      }),
    )
  },
})
