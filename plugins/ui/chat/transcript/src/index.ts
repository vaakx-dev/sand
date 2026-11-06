import { definePlugin } from 'drydock'
import { toolViews, transcript, transcriptParts } from './contract'
import { inject } from './context'
import { turnFooters } from './footers'
import { chatImages } from './image'
import { createParts, createToolViews } from './parts'
import { rendererRegistry } from './registry'
import { css } from './style'

export default definePlugin({
  name: 'transcript',
  description: 'How conversations look on every surface that shows one: messages, markdown, tool steps and the entries plugins register',
  inject,
  apply(ctx) {
    ctx.kit.style(ctx, css)
    const registry = rendererRegistry(ctx.kit)
    const footers = turnFooters()
    const images = chatImages(ctx)
    ctx.provide(transcript, { tool: registry.tool, entry: registry.entry, turnFooter: footers.add })
    ctx.provide(toolViews, createToolViews(images.image))
    ctx.provide(transcriptParts, createParts(ctx, registry, footers.list, images))
  },
})
