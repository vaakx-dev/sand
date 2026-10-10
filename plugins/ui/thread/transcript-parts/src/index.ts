import type { ToolViews, TranscriptParts } from './contract'
import { definePlugin } from 'drydock'
import { mediaImage } from './media/image'
import { itemCache } from './thread/cache'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { errorBody, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

const parts: Omit<TranscriptParts, 'image'> = {
  items: threadItems,
  itemCache,
  sections: resultSections,
  registry: rendererRegistry,
  openStates,
  toolStep,
}

const views: Omit<ToolViews, 'image'> = { field, resultText, errorBody, truncatedNote }

export default definePlugin({
  name: 'transcript-parts',
  description: 'Shared pieces for transcripts and tool views: thread items, tool cards, renderer registry, images',
  uses: { media: 'images load only from inline data' },
  apply(ctx) {
    const image = mediaImage(ctx)
    ctx.provide('transcriptParts', { ...parts, image })
    ctx.provide('toolViews', { ...views, image })
  },
})
