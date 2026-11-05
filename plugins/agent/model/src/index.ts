import { llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { contextBuild, turnEnd, turnStart } from '@sand/loop/contract'
import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { createChoices } from './choices'
import { modelSettings } from './contract'
import { createDefaults } from './defaults'
import { canonical } from './effective'
import { flagSettings } from './flags'
import { serveSettings } from './serve'
import { updateSettings } from './settings'

export default definePlugin({
  name: 'model',
  inject: { cli, sessions },
  async apply(ctx) {
    const defaults = await createDefaults(ctx.cli.home)
    const current = () => ctx.get(llm)
    const choices = createChoices(ctx, defaults)
    ctx.provide(modelSettings, {
      effective: choices.effective,
      resolve: choices.resolved,
      state: choices.state,
      defaults: () => canonical(current(), defaults.get()),
      update: updateSettings,
      flags: flags => flagSettings(flags, current()),
    })
    ctx.on(
      contextBuild,
      (request, session) => {
        const { model, effort, speed } = choices.effective(session)
        return { ...request, ...(model && { model }), ...(effort && { effort }), speed }
      },
      { priority: 150 },
    )
    ctx.on(turnStart, session => choices.begin(session))
    ctx.on(turnEnd, session => choices.settle(session))
    ctx.watch(server, found => (found ? serveSettings(ctx, found, choices, defaults) : undefined))
  },
})
