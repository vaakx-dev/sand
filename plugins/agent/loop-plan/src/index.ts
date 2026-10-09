import { definePlugin } from 'drydock'
import { z } from 'zod'
import { runPlan } from './run'

export default definePlugin({
  name: 'loop-plan',
  description: 'An agent loop that investigates read-only and writes a plan first, then carries it out',
  inject: ['loops'],
  config: z.object({
    plan_tools: z.array(z.string()).default(['read', 'grep', 'glob']),
    max_plan_steps: z.number().int().positive().default(6),
  }),
  apply(ctx, config) {
    ctx.effect(() =>
      ctx.loops.register({
        name: 'plan-execute',
        label: 'Plan, then do',
        description: 'Looks around read-only and writes a numbered plan, then carries it out',
        plugin: 'loop-plan',
        run: runPlan({ tools: config.plan_tools, steps: config.max_plan_steps }),
      }),
    )
  },
})
