import { llm } from '@sand/accounts/contract'
import { sandConfig } from '@sand/config/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createChoices } from './choices'
import { modelSettings, sessionSettings } from './contract'
import { matchSettings } from './match'
import { createPicks } from './picks'
import { serveSettings } from './serve'

export default definePlugin({
  name: 'model',
  inject: { sandConfig },
  config: z.object({ default: sessionSettings().optional(), subagent: sessionSettings().optional(), text: sessionSettings().optional() }),
  apply(ctx, config) {
    const current = () => ctx.get(llm)
    const picks = createPicks(ctx.sandConfig, config, current)
    const choices = createChoices(ctx, picks)
    ctx.provide(modelSettings, {
      effective: choices.effective,
      resolve: choices.resolved,
      select: choices.select,
      state: choices.state,
      pick: picks.pick,
      change: choices.change,
      match: (asked, near) => matchSettings(asked, current(), near),
    })
    ctx.on(turnEnd, session => choices.settle(session))
    ctx.watch(server, found => (found ? serveSettings(ctx, found, choices, picks) : undefined))
  },
})
