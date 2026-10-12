import type { Session } from '@sand/sessions-sqlite/contract'
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
    const systemPrompt = async (session: Session) => {
      const stored = session.path().find(entry => entry.type === 'system')
      if (stored) return String(stored.data)
      const system = await compose(instructions, session, ctx.modelSettings?.effective(session).model, config.instructions)
      session.append('system', system)
      return system
    }
    ctx.provide('instructions', instructions)
    ctx.provide('context', {
      build: async session => {
        const messages = session.messages()
        return { system: await systemPrompt(session), messages, tools: ctx.tools.specs(messages, session) }
      },
    })
  },
})
