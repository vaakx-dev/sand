import { llmPlans } from '@sand/accounts/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { replayPlan } from './plan'
import { sourceSchema } from './contract'

export default definePlugin({
  name: 'replay',
  description: 'Adds model sources that play scripted replies, tool calls and errors, for tests and sandboxes',
  config: z.object({ sources: z.array(sourceSchema).default([]) }).default({ sources: [] }),
  apply(ctx, { sources }) {
    ctx.watch(llmPlans, plans => plans && joinDisposers(...sources.map(source => plans.register(replayPlan(source)))))
  },
})
