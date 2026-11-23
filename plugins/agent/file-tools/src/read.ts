import type { Attachments } from '@sand/attachments/contract'
import type { Tool } from '@sand/tools/contract'
import { head } from '@sand/util'
import { isFolder } from '@sand/util/fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { readText } from './files'

const input = z.object({
  path: z.string().describe('File or folder path, absolute or relative to the working directory'),
  offset: z.number().int().min(1).optional().describe('1-based line or entry number to start reading from'),
  limit: z.number().int().min(1).optional().describe('Maximum number of lines or entries to read (default 2000)'),
})

interface Page {
  offset: number
  limit: number
}

const paged = (lines: string[], { offset, limit }: Page, unit: string) => {
  const shown = lines.slice(offset - 1, offset - 1 + limit)
  const remaining = lines.length - (offset - 1 + shown.length)
  return { shown, more: remaining > 0 ? `\n… ${remaining} more ${unit}` : '' }
}

const entries = async (folder: string) =>
  (await readdir(folder, { withFileTypes: true })).map(entry => (entry.isDirectory() ? `${entry.name}/` : entry.name)).sort()

const listing = async (folder: string, page: Page) => {
  const { shown, more } = paged(await entries(folder), page, 'items')
  return shown.length ? shown.join('\n') + more : 'Empty folder'
}

const numbered = (text: string, page: Page) => {
  const { shown, more } = paged(text.split(/\r?\n/), page, 'lines')
  return shown.map((line, index) => `${String(page.offset + index).padStart(6)}\t${head(line, 2000)}`).join('\n') + more
}

export const readTool = (attachments: () => Attachments): Tool<typeof input> => ({
  name: 'read',
  description:
    'Read a file, with line numbers, or list a folder, with a / after each subfolder. Images and PDFs come back as images and documents you can see.',
  parallel: true,
  input,
  act: ({ path }) => ({ effect: 'read', paths: [path], summary: `Read ${path}` }),
  needs: ['pc'],
  async run({ path, offset = 1, limit = 2000 }, { cwd }) {
    const full = resolve(cwd, path)
    const page = { offset, limit }
    if (await isFolder(full)) return listing(full, page)
    if (attachments().isMedia(full)) return [await attachments().fromFile(full)]
    const { content: text } = await readText(full)
    if (text.slice(0, 8192).includes('\0')) throw new Error(`${path} is a binary file`)
    return numbered(text, page)
  },
})
