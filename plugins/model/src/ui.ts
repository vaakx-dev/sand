import { definePlugin } from 'drydock'
import type { Choices } from './choices'
import type { Defaults } from './defaults'
import { effortCommand } from './commands/effort'
import { fastCommand } from './commands/fast'
import { modelCommand } from './commands/model'

export const modelUI = (choices: Choices, defaults: Defaults) =>
  definePlugin({
    name: 'model-ui',
    inject: ['ui', 'sessions'],
    apply(ctx) {
      const tools = { ctx, choices, defaults }
      for (const command of [modelCommand(tools), effortCommand(tools), fastCommand(tools)]) ctx.effect(() => ctx.ui.command(command))
    },
  })
