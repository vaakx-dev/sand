import { botProfile, type BotProfileSection, botViews, jobEntry, type JobEntry } from '@sand/bots/contract'
import { firstRun } from '@sand/features/contract'
import { closeDrawer, layout, layoutChange, spaces } from '@sand/layout/contract'
import { modelPicker } from '@sand/model-picker/contract'
import { transcript } from '@sand/transcript/contract'
import { owned, pulse } from '@sand/reactive'
import { models, modelsChange } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import { byOrder } from '@sand/util'
import { definePlugin } from 'drydock'
import { createAddress, newBot } from './address'
import { avatar } from './avatar'
import { jobCard } from './chat/job'
import { inject } from './context'
import { firstBot } from './create/first'
import { css } from './face/motion'
import { host, space } from './host'
import { mainView, pageOf } from './main'
import { sideView } from './side'
import { botStore } from './store'

export default definePlugin({
  name: 'bots-space',
  description: "The Bots space: the bot list beside the chosen bot's conversation, a new-bot flow with templates, and each bot's profile and memory",
  inject,
  apply(ctx) {
    ctx.kit.style(ctx, css)
    const store = botStore(ctx)
    const address = createAddress(ctx)
    const shell = pulse(ctx, [layoutChange, modelsChange], [layout, modelPicker, models])
    const narrow = shell.read(() => ctx.get(layout)?.state().narrow ?? false)
    const page = owned(ctx, () => derive(() => pageOf(address.current(), store.bots.get())))
    const current = () => {
      const shown = page.get()
      return shown.kind === 'chat' || shown.kind === 'profile' ? shown.bot.id : undefined
    }
    const first = () => store.bots.get()?.[0]?.id ?? newBot
    const showSide = () => ctx.get(layout)?.toggle('side', true)
    const choose = (id: string) => {
      address.show(id)
      closeDrawer(ctx)
    }

    const sections = sig<BotProfileSection[]>([])
    const main = {
      ctx,
      store,
      address,
      page,
      narrow,
      showSide,
      picker: shell.read(() => ctx.get(modelPicker)),
      defaults: shell.read(() => ctx.get(models)?.defaults() ?? {}),
      sections,
    }

    ctx.watch(firstRun, found =>
      found?.step({
        feature: 'bots',
        render: firstBot(ctx.kit, store, bot => {
          choose(bot)
          ctx.get(spaces)?.open(space)
        }),
      }),
    )

    ctx.watch(transcript, found => found?.entry(jobEntry, (entry, bot) => jobCard(ctx.kit, { store, edit: () => address.profile(bot) }, bot, entry.data as JobEntry)))

    ctx.provide(botProfile, {
      section(section) {
        sections.update(all => [...all, section].sort(byOrder))
        return () => sections.update(all => all.filter(other => other !== section))
      },
    })

    ctx.provide(botViews, {
      open(bot) {
        address.open(bot)
        ctx.get(spaces)?.open(space)
      },
      avatar,
    })

    host(
      ctx,
      {
        side: close =>
          sideView(ctx.kit, {
            bots: store.bots,
            current,
            narrow,
            choose,
            create: () => choose(newBot),
            ...(close && { close }),
            hide: () => ctx.get(layout)?.toggle('side', false),
          }),
        main: close => mainView(main, close),
        attention: () => store.bots.get()?.some(bot => bot.status === 'failed' || bot.status === 'waiting') ?? false,
        requested: () => Boolean(address.route.get().bot),
        left: address.drop,
      },
      {
        open: () => Boolean(address.route.get().bot),
        toggle: () => (address.route.get().bot ? address.leave() : address.open(first())),
        leave: address.leave,
      },
    )
  },
})
