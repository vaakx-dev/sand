import { llm } from '@sand/accounts/contract'
import { cli } from '@sand/config/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createChoices } from './choices'
import { modelSettings } from './contract'
import { createDefaults } from './defaults'
import { canonical } from './effective'
import { matchSettings } from './match'
import { serveSettings } from './serve'

export default definePlugin({
  name: 'model',
  inject: { cli },
  async apply(ctx) {
    const current = () => ctx.get(llm)
    const defaults = await createDefaults(ctx.cli.home, () => current()?.models?.().find(model => !model.hidden)?.id)
    const choices = createChoices(ctx, defaults)
    ctx.provide(modelSettings, {
      effective: choices.effective,
      resolve: choices.resolved,
      select: choices.select,
      state: choices.state,
      defaults: () => canonical(current(), defaults.get()),
      change: choices.change,
      match: (asked, near) => matchSettings(asked, current(), near),
    })
    ctx.on(turnEnd, session => choices.settle(session))
    ctx.watch(server, found => (found ? serveSettings(ctx, found, choices, defaults) : undefined))
  },
})
