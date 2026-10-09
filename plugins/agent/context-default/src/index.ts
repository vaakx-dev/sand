import { toolNotes } from '@sand/host'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { compose } from './system'

export default definePlugin({
  name: 'context-default',
  inject: ['tools'],
  config: z.object({ instructions: z.string().optional() }),
  apply(ctx, config) {
    ctx.provide('context', {
      async build(session) {
        const stored = session.path().find(entry => entry.type === 'system')
        const system = stored
          ? (stored.data as string)
          : (session.append('system', await compose(session, toolNotes(ctx.tools), config.instructions)).data as string)
        return { system, messages: session.messages(), tools: ctx.tools.specs() }
      },
    })
  },
})
