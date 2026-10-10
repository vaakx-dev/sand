import type { MenuKit, ToolViews, TranscriptParts } from './contract'
import { definePlugin } from 'drydock'
import { mediaImage } from './media/image'
import { copyAction } from './menu/copy'
import { textMenu } from './menu/text'
import { itemCache } from './thread/cache'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { errorBody, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

const parts: Omit<TranscriptParts, 'image' | 'menus' | 'toolStep'> = {
  items: threadItems,
  itemCache,
  sections: resultSections,
  registry: rendererRegistry,
  openStates,
}

const views: Omit<ToolViews, 'image'> = { field, resultText, errorBody, truncatedNote }

export default definePlugin({
  name: 'transcript-parts',
  description: 'Shared pieces for transcripts and tool views: thread items, tool cards, renderer registry, images',
  uses: { media: 'images load only from inline data', notify: 'copying is not confirmed' },
  apply(ctx) {
    const image = mediaImage(ctx)
    const say = (text: string, failed: boolean) => ctx.notify?.push(text, { level: failed ? 'error' : 'info' })
    const menus: MenuKit = { text: textMenu, copy: copyAction(say) }
    ctx.provide('transcriptParts', { ...parts, image, menus, toolStep: (tool, options) => toolStep(tool, options, menus) })
    ctx.provide('toolViews', { ...views, image })
  },
})
