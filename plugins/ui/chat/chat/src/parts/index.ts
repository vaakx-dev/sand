import type { ChatContext } from '../context'
import type { MediaImage, ToolViews, TranscriptParts } from './contract'
import { mediaImage } from './image'
import { menuKit } from './menus'
import { itemCache } from './thread/cache'
import { threadItems } from './thread/items'
import { field, resultText } from './thread/results'
import { resultSections } from './thread/sections'
import { errorBody, outputText, truncatedNote } from './tools/notes'
import { toolStep } from './tools/step'
import { openStates } from './transcript/open'
import { rendererRegistry } from './transcript/registry'

export const transcriptParts = (ctx: ChatContext): TranscriptParts => {
  const image = mediaImage(ctx)
  const menus = menuKit(ctx.kit)
  return {
    items: threadItems,
    itemCache,
    sections: resultSections,
    registry: changed => rendererRegistry(ctx.kit, changed),
    openStates,
    menus,
    image,
    toolStep: (tool, options) => toolStep(ctx.kit, tool, options, menus, thread => ctx.threads.get(thread)?.info.cwd),
  }
}

export const createToolViews = (image: MediaImage): ToolViews => ({ field, resultText, errorBody, outputText, truncatedNote, image })
