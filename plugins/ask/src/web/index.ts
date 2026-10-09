import type { Composer } from '@sand/protocol'
import { effect, pulse, style, untrack, type Derive } from '@sand/dom'
import { definePlugin, type Context } from 'drydock'
import { toolName } from '../choices'
import { openAsk } from './answering'
import { pendingAsk, type PendingAsk } from './pending'
import { askRenderer } from './row'
import { css } from './style'

const mountAsk = (ctx: Context<'wire'>, composer: Composer, pending: Derive<PendingAsk | undefined>) =>
  effect(() => {
    const ask = pending.get()
    if (!ask) return
    return untrack(() => openAsk(ctx, composer, ask))
  })

export default definePlugin({
  name: 'ask-view',
  description: "Shows the agent's questions above the composer and the answers in the thread",
  inject: ['threads', 'wire'],
  uses: {
    composer: "questions can't be answered, only skipped by stopping the turn",
    transcript: 'asked questions and their answers are not shown in the thread',
  },
  apply(ctx) {
    style(ctx, css)
    const changes = pulse(ctx, ['thread.select', 'thread.change', 'threads.change'])
    const pending = pendingAsk(ctx, changes)
    ctx.watch('composer', composer => (composer ? mountAsk(ctx, composer, pending) : undefined))
    ctx.watch('transcript', transcript => transcript?.tool(toolName, askRenderer))
  },
})
