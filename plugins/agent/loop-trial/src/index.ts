import { definePlugin } from 'drydock'
import { trialTool } from './agent-tool'
import { trialCommand } from './command'
import { loopGuard } from './guard'
import { createTrial } from './trial'

export default definePlugin({
  name: 'loop-trial',
  description: 'Tries a draft loop plugin on a scripted model before it replaces the installed one',
  inject: ['cli', 'loops', 'paths', 'sessions', 'tools'],
  uses: { ui: 'there is no /loop-trial command' },
  apply(ctx) {
    const trial = createTrial(ctx)
    ctx.provide('loopTrial', trial)
    ctx.effect(() => ctx.tools.register(trialTool(ctx.cli.home, trial)))
    ctx.on('tool.before', loopGuard(ctx.cli.home), { priority: 1000 })
    ctx.watch('ui', ui => ui?.command(trialCommand(ui, trial)))
  },
})
