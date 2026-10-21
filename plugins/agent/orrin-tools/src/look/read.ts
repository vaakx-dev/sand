import type { OutlineItem } from '@sand/orrin/contract'
import { z } from 'zod'
import type { MakeTool, Scope } from '../scope'
import { outlineOf } from './outline'

const input = z.object({
  path: z.string().describe('File path, relative to the working directory or absolute'),
  anchor: z.string().optional().describe('A symbol or heading name from outline, or a [anchor] from search; reads just that section'),
  offset: z.number().int().min(1).optional().describe('1-based line number to start reading from'),
  limit: z.number().int().min(1).optional().describe('Maximum number of lines to read (default 2000)'),
})

interface Slice {
  offset: number
  limit: number
  anchor?: string
}

const pick = (items: OutlineItem[], anchor: string) => {
  const wanted = anchor.toLowerCase()
  const named = items.filter(item => item.line !== null || item.anchor)
  return named.find(item => item.name.toLowerCase() === wanted) ?? named.find(item => item.name.toLowerCase().includes(wanted))
}

const anchored = async (scope: Scope, path: string, anchor: string, limit: number | undefined, signal: AbortSignal): Promise<Slice> => {
  const items = await outlineOf(scope, path, signal)
  const item = pick(items, anchor)
  if (!item?.line) return { anchor: item?.anchor ?? anchor, offset: 1, limit: limit ?? 2000 }
  const start = item.line
  const next = items.find(other => other.line !== null && other.line > start && other.depth <= item.depth)
  return { offset: start, limit: limit ?? (next?.line ? next.line - start : 2000) }
}

const numbered = (content: string, offset: number, total: number | null) => {
  const lines = content.replace(/\r?\n$/, '').split(/\r?\n/)
  const shown = lines.map((line, index) => `${String(offset + index).padStart(6)}\t${line.slice(0, 2000)}`)
  const remaining = (total ?? 0) - (offset - 1 + lines.length)
  return shown.join('\n') + (remaining > 0 ? `\n… ${remaining} more lines` : '')
}

const readDisk = async (scope: Scope, full: string, { offset, limit }: Slice) => {
  const file = Bun.file(full)
  if (scope.attachments.isMedia(full)) return [await scope.attachments.fromBytes(await file.bytes(), full)]
  const text = await file.text()
  if (text.slice(0, 8192).includes('\0')) throw new Error(`${full} is a binary file`)
  const lines = text.replace(/\r?\n$/, '').split(/\r?\n/)
  const shown = lines.slice(offset - 1, offset - 1 + limit)
  return shown.length ? numbered(shown.join('\n'), offset, lines.length) : `${full} has no lines there`
}

export const readTool = (tool: MakeTool) =>
  tool({
    name: 'read',
    description:
      'Read a file: project files through Orrin, others straight from disk. Text comes back with line numbers; give anchor (a name from outline) to read one section, or offset and limit for a slice. Images and PDFs come back as images and documents you can see.',
    input,
    replaces: ['read'],
    async run({ path, anchor, offset, limit }, scope, { signal }) {
      const file = scope.projectPath(path)
      if (!file) {
        if (anchor) throw new Error(`${path} is outside the project, so anchors don't work; use offset and limit`)
        return readDisk(scope, scope.diskPath(path), { offset: offset ?? 1, limit: limit ?? 2000 })
      }
      const where = { project: scope.project, view: scope.view, path: file }
      if (scope.attachments.isMedia(file)) {
        const read = await scope.orrin.call('read', { ...where, encoding: 'base64' }, signal)
        return [await scope.attachments.fromBytes(Buffer.from(read.content ?? '', 'base64'), file)]
      }
      const slice = anchor ? await anchored(scope, file, anchor, limit, signal) : { offset: offset ?? 1, limit: limit ?? 2000 }
      const read = await scope.orrin.call('read', { ...where, ...slice }, signal)
      if (read.binary) throw new Error(`${path} is a binary file (${read.size} bytes)`)
      return read.content ? numbered(read.content, slice.offset, read.total_lines) : `${path} has no lines there`
    },
  })
