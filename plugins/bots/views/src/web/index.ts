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
import { modelTargets } from '@sand/model-panel/contract'
import { needs } from '@sand/needs-you/contract'
import { palette, visitsOf, type PaletteItem } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { transcript } from '@sand/transcript/contract'
import { joinDisposers } from '@sand/util'
import { models, modelsChange, projects, projectsChange, threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { conversations } from './chat/conversations'
import { changeNote } from './chat/change'
import { inject } from './context'
import { openNewBot } from './create/sheet'
import { morningNote } from './jobs/morning'
import { runNote } from './jobs/run'
import { effective } from './models'
import { type BotView, projectNames, type Parts } from './parts'
import { openProfile } from './profile/sheet'
import { registry } from './registry'
import { botScreen } from './screen/bot'
import { botsGroup } from './sidebar'
import { botStore } from './store'
import { botNeeds } from './needs'
import { modelTarget } from './target'

const VIEWS: BotView[] = ['jobs', 'chat']

const viewOf = (tab: string | undefined) => VIEWS.find(view => view === tab)

export default definePlugin({
  name: 'bot-views',
  description: "Bots in the sidebar; each bot's screen with its jobs, its chat and the model it runs with; its profile and New bot; bots waiting on you in Needs you",
  inject,
  apply(ctx) {
    const sections = registry<BotProfileSection>()
    const automationSources = registry<BotAutomationSource>()
    const known = pulse(ctx, [projectsChange], [projects])
    const parts: Parts = {
      ctx,
      store: botStore(ctx),
      toasts: toastsOf(ctx),
      chats: conversations(ctx),
      projects: owned(ctx, () => known.read(() => [...ctx.projects.groups(), ...ctx.projects.archived()])),
      shown(project) {
        known.version.get()
        return ctx.projects.shown({ project })
      },
      defaults: owned(ctx, () => pulse(ctx, [modelsChange], [models]).read(() => effective({}, ctx.get(models)?.defaults() ?? {}))),
      advanced: owned(ctx, () => pulse(ctx, [], [advanced]).read(() => ctx.get(advanced)?.on() ?? false)),
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

    ctx.effect(() => ctx.shell.section({ id: 'bots', order: 10, groups: () => [botsGroup(parts)] }))
    ctx.effect(() => ctx.shell.route({ kind: botRoute, render: route => botScreen(parts, route) }))
    ctx.watch(needs, found => found?.source(botNeeds(parts)))
    ctx.effect(() =>
      ctx.shell.subject(({ kind, id }) => {
        const device = ctx.get(threads)?.device()
        if (kind !== botRoute || !id || !device) return undefined
        const folder = parts.store.find(id)?.folder
        return { session: id, owner: 'bot', device, ...(folder && { cwd: folder }) }
      }),
    )
    ctx.watch(modelTargets, targets =>
      targets?.source(({ session }) => (parts.advanced.get() && parts.store.find(session) ? modelTarget(parts, session) : undefined)),
    )

    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          found.entry(changeEntry, entry => changeNote(ctx.kit, entry.data as ChangeEntry)),
          found.entry(runEntry, (entry, bot) => runNote(ctx.kit, entry, () => parts.chats.get(bot).entries.get())),
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
