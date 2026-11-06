import type { Conversation } from '@sand/engine/contract'
import { paths } from '@sand/paths/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { context, promptBase, promptSections } from './contract'
import { createInstructions } from './instructions'
import { compose } from './system'

const sharedFile = Bun.file(join(import.meta.dir, 'shared.md')).text()
const threadIntro = "You are sand, an agent with full access to the user's machine."

export default definePlugin({
  name: 'prompt',
  inject: { paths, tools },
  config: z.object({ instructions: z.string().optional() }),
  apply(ctx, config) {
    const written = createInstructions(ctx.tools, ctx.paths, config.instructions)
    const shared = async (conversation: Conversation) => [(await sharedFile).trimEnd(), ...(await ctx.waterfall(promptSections, [], conversation))]
    ctx.provide(context, {
      async thread(session, model) {
        const base = await ctx.waterfall(promptBase, [threadIntro, ...(await shared(session))], session)
        const project = await written.project(session.cwd, session.project)
        return compose(written, session, model, base, [project && `# Project instructions\n\n${project}`])
      },
      system: async (conversation, model, { intro, parts }) => compose(written, conversation, model, [intro, ...(await shared(conversation))], parts),
      tools: (session, messages) => ctx.tools.specs(messages, session),
    })
  },
})
