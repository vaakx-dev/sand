import { definePlugin } from 'drydock'
import { createChoices } from './choices'
import { createDefaults } from './defaults'
import { resolve } from './effective'
import { flagSettings } from './flags'
import { serveSettings } from './serve'
import { settingsOf, updateSettings } from './settings'
import { modelUI } from './ui'

export default definePlugin({
  name: 'model',
  inject: ['cli', 'sessions'],
  async apply(ctx) {
    const defaults = await createDefaults(ctx.cli.home, () => ({ model: ctx.llm?.models?.()[0]?.id }))
    const choices = createChoices(ctx, defaults)
    ctx.provide('modelSettings', {
      of: settingsOf,
      effective: session => resolve(settingsOf(session), defaults.get(), ctx.llm),
      resolve: settings => resolve(settings, defaults.get(), ctx.llm),
      state: choices.state,
      defaults: defaults.get,
      update: updateSettings,
      flags: () => flagSettings(ctx.cli?.flags, ctx.llm),
    })
    ctx.on(
      'context.build',
      (request, session) => {
        const { model, effort, speed } = resolve(settingsOf(session), defaults.get(), ctx.llm)
        return { ...request, ...(model && { model }), ...(effort && { effort }), speed }
      },
      { priority: 150 },
    )
    ctx.on('turn.end', session => choices.settle(session))
    ctx.on('turn.continue', session => choices.settle(session))
    ctx.watch('server', server => (server ? serveSettings(ctx, server, choices, defaults) : undefined))
    ctx.plugin(modelUI(choices, defaults))
  },
})
