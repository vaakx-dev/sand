import type { Transcript } from './contract'
import { owned, place, style } from '@sand/dom'
import { definePlugin } from 'drydock'
import { chatController } from './controller'
import { css } from './style'

export default definePlugin({
  name: 'transcript-chat',
  description: 'Chat transcript: bubbles, markdown, "Worked for" tool groups, agent reports, streamed in place',
  inject: ['threads', 'transcriptParts', 'markdown'],
  uses: { layout: 'lands loose on the stage', composer: 'the empty-state hint does not focus a composer', commands: 'the empty state cannot open the extensions drawer', projects: 'the empty state shows the sand logo instead of the project icon', palette: 'the empty state does not offer search' },
  apply(ctx) {
    style(ctx, css)
    const registry = ctx.transcriptParts.registry(() => chat.render())
    const chat = owned(ctx, () => chatController(ctx, registry, ctx.transcriptParts.openStates()))
    const transcript: Transcript = { tool: registry.tool, entry: registry.entry, scrollToEnd: chat.scrollToEnd }

    chat.render()
    place(ctx, 'main', chat.root, 1)
    ctx.on('thread.change', id => {
      if (id === ctx.threads.current()?.id) chat.render()
    })
    ctx.on('thread.select', () => chat.render())
    ctx.on('threads.change', chat.forget)
    ctx.effect(() => () => chat.clear())
    ctx.provide('transcript', transcript)
  },
})
