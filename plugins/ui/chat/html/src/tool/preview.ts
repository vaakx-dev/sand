import type { ImageBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import type { Tool } from '@sand/tools/contract'
import type { HtmlPages } from '../contract'
import { columnWidth, maxHtmlChars } from '../page/limits'
import { consoleNote, sizeNote } from '../report'
import { previewDescription } from './describe'
import { missingNote, readPage } from './page'
import type { RecentPages } from './recent'
import { z } from 'zod'

const input = z.object({
  html: z.string().max(maxHtmlChars).optional().describe('A complete, self-contained HTML document.'),
  path: z.string().optional().describe('Path to a .html file to check instead of html.'),
  width: z.number().int().min(240).max(1600).optional().describe(`CSS pixels. Default ${columnWidth}. About 390 checks a phone.`),
})

const screenshot = (media: Media, png: string): ImageBlock => ({
  ...media.put(Buffer.from(png, 'base64'), 'image/png'),
  type: 'image',
  mediaType: 'image/png',
  name: 'preview.png',
})

export const previewTool = (pages: HtmlPages, media: Media, recent: RecentPages): Tool<typeof input> => ({
  name: 'html_preview',
  group: 'html',
  description: previewDescription,
  input,
  async run({ html, path, width = columnWidth }, { session, cwd }) {
    const page = await readPage(pages, { html, path }, cwd)
    if (!page) throw new Error('Pass the document as html, or as the path to a .html file.')
    const preview = await pages.preview(page.html, width)
    recent.remember(session.id, { page, height: preview.height })
    return [
      {
        type: 'text' as const,
        text: `${sizeNote(preview.height, width)} To show exactly this page, call html_render with only a title.${missingNote(page.missing)}${consoleNote(preview.console)}`,
      },
      screenshot(media, preview.png),
    ]
  },
})
