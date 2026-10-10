import { definePlugin } from 'drydock'
import { mediaImage } from './image'
import { menuKit } from './menus'
import { itemCache } from './thread/cache'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { backgroundJobs } from './tools/jobs'
import { errorBody, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

export default definePlugin({
  name: 'transcript-parts',
  description: 'Shared pieces for transcripts and tool views: thread items, tool cards, renderer registry, images',
  uses: {
    media: 'images load only from inline data',
    notify: 'copying is not confirmed and a failed Stop is not reported',
    jobs: 'agent and workflow calls do not show their background run',
  },
  apply(ctx) {
    const image = mediaImage(ctx)
    const menus = menuKit(ctx)
    ctx.provide('transcriptParts', {
      items: threadItems,
      itemCache,
      sections: resultSections,
      registry: rendererRegistry,
      openStates,
      menus,
      image,
      toolStep: (tool, options) => toolStep(tool, options, menus),
    })
    ctx.provide('toolViews', { field, resultText, errorBody, truncatedNote, image, backgroundJobs: backgroundJobs(ctx) })
  },
})
