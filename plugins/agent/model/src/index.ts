import { llm } from '@sand/accounts/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createChoices } from './choices'
import { type ModelSettings, modelSettings, roleOfLevel } from './contract'
import { canonical } from './effective'
import { matchSettings } from './match'
import { pick } from './roles'
import { serveSettings } from './serve'

export default definePlugin({
  name: 'model',
  apply(ctx) {
    const current = () => ctx.get(llm)
    const choices = createChoices(ctx)
    const role: ModelSettings['role'] = role => canonical(current(), pick(current(), role))
    ctx.provide(modelSettings, {
      effective: choices.effective,
      resolve: choices.resolved,
      select: choices.select,
      state: choices.state,
      role,
      level: level => role(roleOfLevel(level)),
      change: choices.change,
      match: (asked, near) => matchSettings(asked, current(), near),
    })
    ctx.on(turnEnd, session => choices.settle(session))
    ctx.watch(server, found => (found ? serveSettings(ctx, found, choices) : undefined))
  },
})
