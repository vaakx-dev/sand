import type { Session } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import type { Artifact, HtmlPages, HtmlRenderEntry } from '../contract'
import { maxHeight, maxHtmlChars, maxTitleChars, minHeight } from '../page/limits'
import type { RenderStore } from '../store'
import { heightNote, renderDescription, shownNote } from './describe'
import { missingNote, readPage } from './page'
import type { RecentPages } from './recent'
import { z } from 'zod'

const entryType = 'html-render'

const input = z.object({
  html: z.string().max(maxHtmlChars).optional().describe('A complete, self-contained HTML document. Leave this out to publish the page html_preview just checked.'),
  path: z.string().optional().describe('Path to a .html file. Leave both this and html out to publish the page html_preview just checked.'),
  title: z.string().min(1).max(maxTitleChars).describe('Short name for the page, shown above it.'),
  height: z.number().int().min(minHeight).max(maxHeight).optional().describe(heightNote),
})

const checkedOrPassed = async (pages: HtmlPages, recent: RecentPages, { html, path, height }: z.infer<typeof input>, session: string, cwd: string) => {
  const page = await readPage(pages, { html, path }, cwd)
  if (page) return { page, height }
  const checked = recent.recall(session)
  if (!checked) throw new Error('There is no page to show. Pass the document as html or path, or check one with html_preview first and then publish it with only a title.')
  return { page: checked.page, height: height ?? checked.height }
}

export const renderTool = (store: RenderStore, pages: HtmlPages, recent: RecentPages, saved: (session: Session, artifact: Artifact) => void): Tool<typeof input> => ({
  name: 'html_render',
  group: 'html',
  description: renderDescription,
  input,
  async run(args, { session, cwd }) {
    const { page, height } = await checkedOrPassed(pages, recent, args, session.id, cwd)
    const written = await store.write(page.html)
    session.append(entryType, { id: written.id, title: args.title, ...(height && { height }) } satisfies HtmlRenderEntry)
    saved(session, { title: args.title, path: written.path })
    return `${shownNote}${missingNote(page.missing)}`
  },
})
