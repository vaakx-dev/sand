import type { Session } from '@sand/protocol'
import { errorMessage, tokens } from '@sand/kit'
import { definePlugin } from 'drydock'
import type { Compactor } from './compact'

export const compactionUI = (compactor: Compactor, schedule: (session: Session, extra?: string) => void) =>
  definePlugin({
    name: 'compaction-ui',
    inject: ['ui', 'context'],
    apply(ctx) {
      ctx.effect(() =>
        ctx.ui.command({
          name: 'compact',
          title: 'Compact conversation',
          description: 'Summarize the conversation to free up context',
          args: '[instructions]',
          async run(args) {
            const session = ctx.ui.session()
            if (!session?.head) return ctx.ui.notify('Nothing to compact')
            const extra = args || undefined
            if (ctx.loop?.active(session)) {
              schedule(session, extra)
              return ctx.ui.notify('The conversation will be compacted before the next model call')
            }
            ctx.ui.notify('Compacting conversation…')
            try {
              const request = await ctx.waterfall('context.build', await ctx.context.build(session), session)
              const after = await compactor.compact(session, request, { reason: 'manual', extra })
              ctx.ui.notify(`Conversation compacted to about ${tokens(after)} tokens`)
            } catch (error) {
              ctx.ui.notify(`Compaction failed: ${errorMessage(error)}`, 'error')
            }
          },
        }),
      )
    },
  })
