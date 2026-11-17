import { llm } from '@sand/accounts/contract'
import { sandConfig } from '@sand/config/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createChoices } from './choices'
import { levels, modelSettings, sessionSettings } from './contract'
import { canonical } from './effective'
import { createLevels } from './levels'
import { matchSettings } from './match'
import { serveSettings } from './serve'

export default definePlugin({
  name: 'model',
  inject: { sandConfig },
  config: z.object({ levels: z.partialRecord(z.enum(levels), sessionSettings()).default({}) }),
  apply(ctx, config) {
    const current = () => ctx.get(llm)
    const picks = createLevels(ctx.sandConfig, config.levels, () => current()?.models?.().find(model => !model.hidden)?.id)
    const choices = createChoices(ctx, picks)
    ctx.provide(modelSettings, {
      effective: choices.effective,
      resolve: choices.resolved,
      select: choices.select,
      state: choices.state,
      level: level => canonical(current(), picks.settings(level)),
      change: choices.change,
      match: (asked, near) => matchSettings(asked, current(), near),
    })
    ctx.on(turnEnd, session => choices.settle(session))
    ctx.watch(server, found => (found ? serveSettings(ctx, found, choices, picks) : undefined))
  },
})
