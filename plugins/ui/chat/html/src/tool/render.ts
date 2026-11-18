import type { Conversation } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import type { Artifact, HtmlPages, HtmlRenderEntry } from '../contract'
import { maxHeight, maxHtmlChars, maxTitleChars, minHeight } from '../page/limits'
import type { RenderStore } from '../store'
import { renderDescription, shownNote } from './describe'
import { missingNote, readPage } from './page'
import type { RecentPages } from './recent'
import { z } from 'zod'

const entryType = 'html-render'

const input = z.object({
  html: z.string().max(maxHtmlChars).optional().describe('A full HTML document'),
  path: z.string().optional().describe('A .html file or an image'),
  title: z.string().min(1).max(maxTitleChars).describe('Name shown above the page'),
  height: z.number().int().min(minHeight).max(maxHeight).optional().describe('Frame height in CSS px'),
})

const checkedOrPassed = async (pages: HtmlPages, recent: RecentPages, { html, path, height }: z.infer<typeof input>, session: string, cwd: string) => {
  const page = await readPage(pages, { html, path }, cwd)
  if (page) return { page, height }
  const checked = recent.recall(session)
  if (!checked) throw new Error('There is no page to show. Pass the document as html or path, or check one with html_preview first and then publish it with only a title.')
  return { page: checked.page, height: height ?? checked.height }
}

export const renderTool = (store: RenderStore, pages: HtmlPages, recent: RecentPages, saved: (conversation: Conversation, artifact: Artifact) => void): Tool<typeof input> => ({
  name: 'html_render',
  group: 'html',
  description: renderDescription,
  input,
  effect: 'read',
  needs: ['folder'],
  async run(args, { conversation, cwd }) {
    const { page, height } = await checkedOrPassed(pages, recent, args, conversation.id, cwd)
    const written = await store.write(page.html)
    conversation.append(entryType, { id: written.id, title: args.title, ...(height && { height }) } satisfies HtmlRenderEntry)
    saved(conversation, { title: args.title, path: written.path })
    return `${shownNote}${missingNote(page.missing)}`
  },
})
