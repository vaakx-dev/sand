import type { Composer } from '@sand/composer-card/contract'
import { pulse } from '@sand/kit/web'
import { effect, untrack, type Derive } from '@vaakx-dev/vrui'
import { definePlugin, type Context } from 'drydock'
import { toolName } from '../reply'
import { openAsk } from './answering'
import { serverAsks } from './asks'
import { pendingAsk, type PendingAsk } from './pending'
import { askRenderer } from './row'

const mountAsk = (ctx: Context<'wire' | 'kit'>, composer: Composer, pending: Derive<PendingAsk | undefined>) =>
  effect(() => {
    const ask = pending.get()
    if (!ask) return
    return untrack(() => openAsk(ctx, composer, ask))
  })

export default definePlugin({
  name: 'ask-view',
  description: "Shows the agent's questions above the composer and the answers in the thread",
  inject: ['threads', 'wire', 'kit'],
  uses: {
    composer: "questions can't be answered, only skipped by stopping the turn",
    transcript: 'asked questions and their answers are not shown in the thread',
    toolViews: 'asked questions and their answers are not shown in the thread',
  },
  apply(ctx) {
    const changes = pulse(ctx, ['thread.select', 'thread.change', 'threads.change'])
    const pending = pendingAsk(ctx, changes, serverAsks(ctx, changes.bump))
    ctx.watch('composer', composer => (composer ? mountAsk(ctx, composer, pending) : undefined))
    ctx.watch('toolViews', views => views && ctx.watch('transcript', transcript => transcript?.tool(toolName, askRenderer(views))))
  },
})
