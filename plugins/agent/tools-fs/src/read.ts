import type { Attachments } from '@sand/attachments/contract'
import type { Tool } from '@sand/tools/contract'
import { extname } from 'node:path'
import { z } from 'zod'
import { isDirectory, locate, readText } from './files'

const media = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.heic', '.avif', '.pdf'])

const input = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  offset: z.number().int().min(1).optional().describe('1-based line number to start reading from'),
  limit: z.number().int().min(1).optional().describe('Maximum number of lines to read (default 2000)'),
})

export const readTool = (attachments: () => Attachments): Tool<typeof input> => ({
  name: 'read',
  description:
    'Read a file. Text is returned with line numbers. Images and PDFs are returned as images and documents you can see. Use offset and limit for large text files.',
  input,
  async run({ path, offset = 1, limit = 2000 }, { cwd }) {
    const full = locate(cwd, path)
    if (await isDirectory(full)) throw new Error(`${path} is a directory`)
    if (media.has(extname(full).toLowerCase())) return [await attachments().fromFile(full)]
    const text = await readText(full)
    if (text.slice(0, 8192).includes('\0')) throw new Error(`${path} is a binary file`)
    const lines = text.split(/\r?\n/)
    const shown = lines.slice(offset - 1, offset - 1 + limit)
    const numbered = shown.map((line, index) => `${String(offset + index).padStart(6)}\t${line.slice(0, 2000)}`)
    const remaining = lines.length - (offset - 1 + shown.length)
    return numbered.join('\n') + (remaining > 0 ? `\n… ${remaining} more lines` : '')
  },
})
