import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createInstructions } from './instructions'
import { compose } from './system'

export default definePlugin({
  name: 'context-default',
  inject: ['paths', 'tools'],
  config: z.object({ instructions: z.string().optional() }),
  apply(ctx, config) {
    const instructions = createInstructions(ctx.tools, ctx.paths)
    ctx.provide('instructions', instructions)
    ctx.provide('context', {
      async build(session) {
        const stored = session.path().find(entry => entry.type === 'system')
        const system = stored
          ? (stored.data as string)
          : (session.append('system', await compose(instructions, session, config.instructions)).data as string)
        return { system, messages: session.messages(), tools: ctx.tools.specs() }
      },
    })
  },
})
