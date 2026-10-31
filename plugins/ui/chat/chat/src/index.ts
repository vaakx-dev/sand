import { place } from '@sand/layout/place'
import { owned } from '@sand/web-client/reactive'
import { modelsChange, threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { chatController } from './controller'
import { createToolViews, transcriptParts } from './parts'
import { toolViews, transcript } from './parts/contract'
import { css } from './style'
import { turnFooters } from './turns/footers'

export default definePlugin({
  name: 'chat',
  description: 'Chat transcript: bubbles, markdown, "Worked for" tool groups, streamed in place, plus the pieces tool views build on',
  inject,
  apply(ctx) {
    ctx.kit.style(ctx, css)
    const parts = transcriptParts(ctx)
    const registry = parts.registry(() => chat.refresh())
    const footers = turnFooters(() => chat.render())
    const chat = owned(ctx, () => chatController(ctx, parts, registry, parts.openStates(), footers))

    chat.render()
    place(ctx, 'main', chat.root, 1)
    ctx.on(threadChange, id => {
      if (id === ctx.threads.current()?.id) chat.render()
    })
    ctx.on(threadSelect, () => chat.render())
    ctx.on(threadsChange, chat.forget)
    ctx.on(modelsChange, chat.stale)
    ctx.provide(toolViews, createToolViews(parts.image))
    ctx.provide(transcript, { tool: registry.tool, entry: registry.entry, turnFooter: footers.add })
  },
})
