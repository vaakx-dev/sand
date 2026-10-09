import type { ToolViews, TranscriptParts } from './contract'
import { definePlugin } from 'drydock'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { errorBody, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

const parts: TranscriptParts = {
  items: threadItems,
  sections: resultSections,
  registry: rendererRegistry,
  openStates,
  toolStep,
}

const views: ToolViews = { field, resultText, errorBody, truncatedNote }

export default definePlugin({
  name: 'transcript-parts',
  description: 'Shared pieces for transcripts and tool views: thread items, tool cards, renderer registry',
  apply(ctx) {
    ctx.provide('transcriptParts', parts)
    ctx.provide('toolViews', views)
  },
})
