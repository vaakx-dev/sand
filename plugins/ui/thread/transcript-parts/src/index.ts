import { definePlugin } from 'drydock'
import { mediaImage } from './image'
import { menuKit } from './menus'
import { itemCache } from './thread/cache'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { backgroundJobs } from './tools/jobs'
import { errorBody, outputText, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

export default definePlugin({
  name: 'transcript-parts',
  description: 'Shared pieces for transcripts and tool views: thread items, tool cards, renderer registry, images',
  inject: ['kit'],
  uses: {
    media: 'images load only from inline data',
    imageViewer: 'images do not open full screen',
    notify: 'copying is not confirmed and a failed Stop is not reported',
    jobs: 'agent and workflow calls do not show their background run',
    threads: 'tool calls show full paths instead of paths inside the thread folder',
  },
  apply(ctx) {
    const image = mediaImage(ctx)
    const menus = menuKit(ctx)
    ctx.provide('transcriptParts', {
      items: threadItems,
      itemCache,
      sections: resultSections,
      registry: changed => rendererRegistry(ctx.kit, changed),
      openStates,
      menus,
      image,
      toolStep: (tool, options) => toolStep(ctx.kit, tool, options, menus, thread => ctx.threads?.get(thread)?.info.cwd),
    })
    ctx.provide('toolViews', { field, resultText, errorBody, outputText, truncatedNote, image, backgroundJobs: backgroundJobs(ctx) })
  },
})
