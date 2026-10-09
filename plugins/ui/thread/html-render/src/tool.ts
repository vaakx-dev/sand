import type { Session } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import type { Artifact, HtmlPages, HtmlRenderEntry } from './contract'
import { z } from 'zod'
import { maxHeight, minHeight } from './page/limits'
import type { RenderStore } from './store'

export const entryType = 'html-render'

const input = z.object({
  path: z.string().describe('Self-contained .html file'),
  title: z.string().min(1).max(200),
  height: z
    .number()
    .int()
    .min(minHeight)
    .max(maxHeight)
    .optional()
    .describe('Max frame height; taller content scrolls. Omit to fit.'),
})

const missingNote = (missing: string[]) =>
  missing.length ? ` These image paths are not files on this machine, so they were left as they are: ${missing.join(', ')}. Ignore this if they are only text.` : ''

const description = "Show a finished HTML page (chart, table, diagram, mockup) above your final reply, which should only add what the page doesn't say. Load the html-render skill first."

export const renderTool = (store: RenderStore, pages: HtmlPages, saved: (session: Session, artifact: Artifact) => void): Tool<typeof input> => ({
  name: 'html_render',
  description,
  input,
  async run({ path, title, height }, { session, cwd }) {
    const { html, missing } = await pages.load(path, cwd)
    const page = await store.write(html)
    session.append(entryType, { id: page.id, title, ...(height && { height }) } satisfies HtmlRenderEntry)
    saved(session, { title, path: page.path })
    return `Shown to the user above your reply.${missingNote(missing)}`
  },
})
