import { drawChip, openContext } from '@sand/context/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { models } from '@sand/web-client/contract'
import type { MediaImage, RendererRegistry, ToolViews, TranscriptParts } from './contract'
import type { TranscriptContext } from './context'
import type { Images } from './image'
import type { Flash } from './integrations/flash'
import { quoteJump } from './integrations/quote-jump'
import { liveItems } from './items/items'
import { field, resultText } from './items/results'
import { settledItems, userItems, type DescribeSettings } from './items/settled'
import { openStates } from './open'
import { itemRows } from './rows'
import type { RowContext } from './rows/row'
import { userMessage } from './rows/user'
import { errorBody, outputText, truncatedNote } from './tools/notes'

export const createParts = (ctx: TranscriptContext, registry: RendererRegistry, images: Images, flash: Flash): TranscriptParts => {
  const custom = (type: string) => Boolean(registry.entryRenderer(type))
  const describe: DescribeSettings = settings => ctx.get(models)?.summary(settings)
  const chip = drawChip(ctx)
  const open = openContext(ctx)
  return {
    version: registry.version,
    settled: (source, path) => settledItems(source, path, custom, describe),
    items: liveItems,
    prompt: (entry, parts) => userItems(entry, parts, true, custom),
    rows(surface) {
      const { kit, markdown } = ctx
      const context: RowContext = { ...surface, kit, registry, markdown, chip, open, media: images.image, image: images.replyImage(surface.conversation) }
      return {
        item: item => itemRows(item, context),
        user: (item, actions, note) => userMessage(item, context, actions, note),
      }
    },
    openStates,
    quoteJump: quoteJump(flash),
  }
}

export const createToolViews = (kit: Kit, image: MediaImage): ToolViews => ({
  field,
  resultText,
  errorBody,
  outputText,
  truncatedNote: (count, position) => truncatedNote(kit, count, position),
  image,
})
