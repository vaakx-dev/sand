import type { Session } from '@sand/chats/contract'
import { paths } from '@sand/paths/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { context, promptBase, promptSections } from './contract'
import { createInstructions } from './instructions'
import { compose } from './system'

const systemFile = Bun.file(join(import.meta.dir, 'system.md')).text()

export default definePlugin({
  name: 'prompt',
  inject: { paths, tools },
  config: z.object({ instructions: z.string().optional() }),
  apply(ctx, config) {
    const written = createInstructions(ctx.tools, ctx.paths, config.instructions)
    const base = async (session: Session) => {
      const sections = await ctx.waterfall(promptSections, [], session)
      return ctx.waterfall(promptBase, [(await systemFile).trimEnd(), ...sections], session)
    }
    ctx.provide(context, {
      system: async (session, model) => compose(written, session, await base(session), model),
      tools: (session, messages) => ctx.tools.specs(messages, session),
    })
  },
})
