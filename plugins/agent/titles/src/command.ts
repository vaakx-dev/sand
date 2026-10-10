import { errorMessage } from '@sand/kit'
import { definePlugin } from 'drydock'
import type { Namer } from './name/namer'

export const titlesUI = (namer: Namer) =>
  definePlugin({
    name: 'titles-ui',
    inject: ['ui'],
    apply(ctx) {
      ctx.effect(() =>
        ctx.ui.command({
          name: 'retitle',
          title: 'Regenerate name',
          description: 'Give this thread a new short name from its messages',
          async run() {
            const session = ctx.ui.session()
            if (!session?.messages().length) return ctx.ui.notify('There is nothing to name yet')
            try {
              const title = await namer.rename(session)
              if (title) ctx.ui.notify(`Thread renamed to ${title}`)
              else ctx.ui.notify('No model could name this thread', 'error')
            } catch (error) {
              ctx.ui.notify(`Naming failed: ${errorMessage(error)}`, 'error')
            }
          },
        }),
      )
    },
  })
