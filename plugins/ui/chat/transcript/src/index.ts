import { notificationTag } from '@sand/chats/contract'
import { definePlugin } from 'drydock'
import { toolViews, transcript, transcriptParts } from './contract'
import { inject } from './context'
import { chatImages } from './image'
import { createParts, createToolViews } from './parts'
import { rendererRegistry } from './registry'
import { notificationRenderer } from './rows/notification'
import { css } from './style'

export default definePlugin({
  name: 'transcript',
  description: 'How conversations look on every surface that shows one: messages, markdown, tool steps and the entries plugins register',
  inject,
  apply(ctx) {
    ctx.kit.style(ctx, css)
    const registry = rendererRegistry(ctx.kit)
    const images = chatImages(ctx)
    ctx.effect(() => registry.entry(notificationTag, notificationRenderer(ctx.kit, registry)))
    ctx.provide(transcript, { tool: registry.tool, entry: registry.entry, notice: registry.notice })
    ctx.provide(toolViews, createToolViews(ctx.kit, images.image))
    ctx.provide(transcriptParts, createParts(ctx, registry, images))
  },
})
