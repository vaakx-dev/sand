import type { Session } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { paths } from '@sand/paths/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { context, instructions, promptSections } from './contract'
import { createInstructions } from './instructions'
import { compose } from './system'

export default definePlugin({
  name: 'prompt',
  inject: { paths, tools },
  config: z.object({ instructions: z.string().optional() }),
  apply(ctx, config) {
    const written = createInstructions(ctx.tools, ctx.paths)
    const systemPrompt = async (session: Session) => {
      const stored = session.path().find(entry => entry.type === 'system')
      if (stored) return String(stored.data)
      const sections = await ctx.waterfall(promptSections, [], session)
      const system = await compose(written, session, sections, ctx.get(modelSettings)?.effective(session).model, config.instructions)
      session.append('system', system)
      return system
    }
    ctx.provide(instructions, written)
    ctx.provide(context, {
      build: async session => {
        const messages = session.messages()
        return { system: await systemPrompt(session), messages, tools: ctx.tools.specs(messages, session) }
      },
    })
  },
})
