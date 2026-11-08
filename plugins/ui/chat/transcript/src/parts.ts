import { drawChip } from '@sand/context/contract'
import { models } from '@sand/web-client/contract'
import type { MediaImage, RendererRegistry, ToolViews, TranscriptParts } from './contract'
import type { TranscriptContext } from './context'
import type { Images } from './image'
import { quoteJump } from './integrations/quote-jump'
import { liveItems } from './items/items'
import { field, resultText } from './items/results'
import { settledItems, userItems, type DescribeSettings } from './items/settled'
import { menuKit } from './menus'
import { openStates } from './open'
import { itemRows } from './rows'
import type { RowContext } from './rows/row'
import { userMessage } from './rows/user'
import { errorBody, outputText, truncatedNote } from './tools/notes'

export const createParts = (ctx: TranscriptContext, registry: RendererRegistry, images: Images): TranscriptParts => {
  const custom = (type: string) => Boolean(registry.entryRenderer(type))
  const describe: DescribeSettings = settings => ctx.get(models)?.summary(settings)
  const menus = menuKit(ctx.kit)
  const chip = drawChip(ctx)
  return {
    version: registry.version,
    settled: (source, path) => settledItems(source, path, custom, describe),
    items: liveItems,
    prompt: (entry, parts) => userItems(entry, parts, true, custom),
    rows(surface) {
      const { kit, markdown } = ctx
      const context: RowContext = { ...surface, kit, registry, markdown, menus, chip, media: images.image, image: images.replyImage(surface.conversation) }
      return {
        item: item => itemRows(item, context),
        user: (item, actions, note) => userMessage(item, context, actions, note),
      }
    },
    openStates,
    quoteJump,
  }
}

export const createToolViews = (image: MediaImage): ToolViews => ({ field, resultText, errorBody, outputText, truncatedNote, image })
