import { botAutomations, botName, botProfile, botRoute, botTabs, botViews, jobEntry, type BotAutomationSource, type BotProfileSection, type BotTabSource, type JobEntry } from '@sand/bots/contract'
import { palette } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { transcript } from '@sand/transcript/contract'
import { homeRoute, type ChipSource } from '@sand/ui-shell/contract'
import { projects, projectsChange } from '@sand/web-client/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { automationsScreen } from './automations/page'
import { jobNote } from './chat/job'
import { inject } from './context'
import { openNewBot } from './create/sheet'
import { homeScreen } from './home'
import { automationsOf, projectNames, type Parts } from './parts'
import { openProfile } from './profile/sheet'
import { registry } from './registry'
import { botScreen } from './screen/bot'
import { botTabRoute, tabScreen } from './screen/tab'
import { botsGroup } from './sidebar'
import { botStore } from './store'
import { openTabs } from './tabs'
import { work } from './work'

const automationsRoute = 'automations'

const listening = (parts: Parts): ChipSource => ({
  key: 'listening',
  label: 'Listening',
  title: 'Listening',
  order: 40,
  items: scope =>
    scope.kind === 'owner'
      ? automationsOf(parts, scope.owner)
          .filter(item => !item.paused)
          .map(item => ({ id: item.id, label: item.title, icon: item.icon, meta: item.when, open: () => parts.profile(scope.owner) }))
      : [],
})

export default definePlugin({
  name: 'bot-views',
  description: "Bots in the sidebar; each bot's screen with its chat, work tabs and Project page; its profile, New bot, Automations and the Listening chip",
  inject,
  apply(ctx) {
    const tabSources = registry<BotTabSource & { order?: number }>()
    const sections = registry<BotProfileSection>()
    const automationSources = registry<BotAutomationSource>()
    const known = pulse(ctx, [projectsChange], [projects])
    const parts: Parts = {
      ctx,
      store: botStore(ctx),
      work: work(tabSources),
      tabs: openTabs(),
      projects: owned(ctx, () => known.read(() => ctx.get(projects)?.groups({ hidden: true }) ?? [])),
      sections,
      automationSources,
      open(bot, tab) {
        if (!tab) return ctx.shell.open({ kind: botRoute, id: bot })
        parts.tabs.add(bot, tab)
        ctx.shell.open(ctx.shell.state() === 'phone' ? { kind: botTabRoute, id: bot, tab } : { kind: botRoute, id: bot, tab })
      },
      profile: bot => openProfile(parts, bot),
      create: () => openNewBot(parts),
    }

    ctx.provide(botViews, { open: parts.open })
    ctx.provide(botTabs, { source: tabSources.add })
    ctx.provide(botProfile, { section: sections.add })
    ctx.provide(botAutomations, { source: automationSources.add })

    ctx.effect(() => ctx.shell.section({ id: 'bots', order: 10, groups: () => [botsGroup(parts)] }))
    ctx.effect(() => ctx.shell.route({ kind: botRoute, render: route => botScreen(parts, route) }))
    ctx.effect(() => ctx.shell.route({ kind: botTabRoute, render: route => tabScreen(parts, route) }))
    ctx.effect(() => ctx.shell.route({ kind: homeRoute, order: 100, render: () => homeScreen(parts) }))
    ctx.effect(() => ctx.shell.route({ kind: automationsRoute, render: () => automationsScreen(parts) }))
    ctx.effect(() => ctx.shell.chip(listening(parts)))
    owned(ctx, () =>
      effect(() => {
        if (!automationSources.items.get().length) return undefined
        return untrack(() => ctx.shell.nav({ id: 'automations', label: 'Automations', icon: 'clock', order: 10, to: { kind: automationsRoute } }))
      }),
    )

    ctx.watch(transcript, found =>
      found?.entry(jobEntry, (entry, bot) => jobNote(ctx.kit, { store: parts.store, edit: parts.profile, report: error => ctx.report(error) }, bot, entry.data as JobEntry)),
    )
    ctx.watch(palette, found =>
      found?.source({
        id: 'bots',
        order: 5,
        items: query =>
          query.startsWith('/')
            ? []
            : (parts.store.bots.get() ?? []).map(bot => ({
                id: `bot:${bot.id}`,
                group: 'Bots',
                icon: 'bot',
                label: botName(bot),
                detail: projectNames(parts, bot.projects),
                search: bot.job,
                run: () => parts.open(bot.id),
              })),
      }),
    )
  },
})
