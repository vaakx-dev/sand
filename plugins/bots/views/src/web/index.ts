import { advanced } from '@sand/advanced/contract'
import { botAutomations, botName, botProfile, botRoster, botRoute, botViews, changeEntry, type BotAutomationSource, type BotProfileSection, type ChangeEntry } from '@sand/bots/contract'
import { modelTargets } from '@sand/model-panel/contract'
import { needs } from '@sand/needs-you/contract'
import { palette, type PaletteItem } from '@sand/palette/contract'
import { owned, pulse } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { transcript } from '@sand/transcript/contract'
import type { ChipSource } from '@sand/ui-shell/contract'
import { models, modelsChange, projects, projectsChange, threads } from '@sand/web-client/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { automationsScreen } from './automations/page'
import { conversations } from './chat/conversations'
import { changeNote } from './chat/change'
import { inject } from './context'
import { openNewBot } from './create/sheet'
import { effective } from './models'
import { automationsOf, projectNames, type Parts } from './parts'
import { openProfile } from './profile/sheet'
import { registry } from './registry'
import { botScreen } from './screen/bot'
import { botsGroup } from './sidebar'
import { botStore } from './store'
import { botNeeds } from './needs'
import { modelTarget } from './target'

const automationsRoute = 'automations'

const listening = (parts: Parts): ChipSource => ({
  key: 'listening',
  label: 'Listening',
  title: 'Listening',
  order: 40,
  items: ({ owner }) =>
    automationsOf(parts, owner)
      .filter(item => !item.paused)
      .map(item => ({ id: item.id, label: item.title, icon: item.icon, detail: item.when, open: () => parts.profile(owner) })),
})

export default definePlugin({
  name: 'bot-views',
  description: "Bots in the sidebar; each bot's screen with its chat and the model it runs with; its profile, New bot, Automations and the Listening chip; bots waiting on you in Needs you",
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
      projects: owned(ctx, () => known.read(() => ctx.projects.groups({ hidden: true }))),
      shown(project) {
        known.version.get()
        return ctx.projects.shown({ project })
      },
      defaults: owned(ctx, () => pulse(ctx, [modelsChange], [models]).read(() => effective({}, ctx.get(models)?.defaults() ?? {}))),
      advanced: owned(ctx, () => pulse(ctx, [], [advanced]).read(() => ctx.get(advanced)?.on() ?? false)),
      sections,
      automationSources,
      open(bot) {
        ctx.shell.open({ kind: botRoute, id: bot })
      },
      profile: bot => openProfile(parts, bot),
      create: () => openNewBot(parts),
    }

    ctx.provide(botViews, { open: parts.open })
    ctx.provide(botRoster, { list: () => parts.store.bots.get() ?? [], find: parts.store.find })
    ctx.provide(botProfile, { section: sections.add })
    ctx.provide(botAutomations, { source: automationSources.add })

    ctx.effect(() => ctx.shell.section({ id: 'bots', order: 10, groups: () => [botsGroup(parts)] }))
    ctx.effect(() => ctx.shell.route({ kind: botRoute, render: route => botScreen(parts, route) }))
    ctx.effect(() => ctx.shell.route({ kind: automationsRoute, render: () => automationsScreen(parts) }))
    ctx.effect(() => ctx.shell.chip(listening(parts)))
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
    owned(ctx, () =>
      effect(() => {
        if (!automationSources.items.get().length) return undefined
        return untrack(() => ctx.shell.nav({ id: 'automations', label: 'Automations', icon: 'clock', order: 10, place: 'nav', to: { kind: automationsRoute } }))
      }),
    )

    ctx.watch(transcript, found =>
      found?.entry(changeEntry, (entry, bot) => changeNote(ctx.kit, { store: parts.store, edit: parts.profile, report: error => parts.toasts.error('Couldn’t restore the job', error) }, bot, entry.data as ChangeEntry)),
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
                  icon: 'bot',
                  label: botName(bot),
                  detail: projectNames(parts, bot.projects),
                  search: bot.job,
                  run: () => parts.open(bot.id),
                })),
                { id: 'bot:new', group: 'Bots', icon: 'plus', label: 'New bot…', run: () => parts.create() },
              ],
      }),
    )
  },
})
