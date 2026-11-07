import { oneLine, plural, serial } from '@sand/util'
import { expandHome, isFolder } from '@sand/util/fs'
import type { Watcher } from '@sand/watch/contract'
import { stat } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { z } from 'zod'
import type { Change, Kind } from '../contract'

const validPattern = (pattern: string) => {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

const input = z.object({
  path: z.string().min(1).describe('The log file to follow'),
  pattern: z.string().refine(validPattern, 'not a valid regular expression').optional().describe('Only lines matching this regular expression, ignoring case'),
})

const position = z.object({ offset: z.number().int().nonnegative(), ino: z.number().optional() })
type Position = z.output<typeof position>

const readMost = 1 << 20
const detailMost = 8_000
const newline = 0x0a
const checkMs = 2_000

const fileInfo = (path: string) => stat(path).catch(() => undefined)

const readLines = async (path: string, from: number, size: number) => {
  const start = Math.max(from, size - readMost)
  const bytes = await Bun.file(path).slice(start, size).bytes()
  const end = bytes.lastIndexOf(newline) + 1
  const text = new TextDecoder().decode(bytes.subarray(0, end))
  const whole = start > from ? text.slice(text.indexOf('\n') + 1) : text
  const lines = whole.split('\n').map(line => line.replace(/\r$/, '')).filter(line => line.trim())
  return { lines, next: start + end }
}

const clipTail = (text: string) => (text.length > detailMost ? `…${text.slice(-detailMost)}` : text)

const changeOf = (path: string, lines: string[], matching: boolean, at: number): Change => {
  const last = lines.at(-1) ?? ''
  const count = plural(lines.length, matching ? 'matching line' : 'new line')
  const summary = lines.length === 1 ? oneLine(last, 200) : `${count} in ${basename(path)}, last: ${oneLine(last, 160)}`
  const detail = clipTail(lines.join('\n'))
  return { at, from: path, summary, ...(detail === summary ? {} : { detail }) }
}

export const fileKind = (watcher: Pick<Watcher, 'debounced'>, everyMs = checkMs): Kind<typeof input> => ({
  name: 'file',
  label: 'Log file',
  description: 'Lines appended to a file, such as a log, optionally only those matching a pattern. Starts at the current end, so only new lines count.',
  input,
  describe: ({ path, pattern }) => `New lines in ${basename(path)}${pattern ? ` matching /${pattern}/` : ''}`,
  async start({ path: given, pattern }, context) {
    const path = expandHome(given)
    const folder = dirname(path)
    if (!(await isFolder(folder))) throw new Error(`${folder} is not a folder`)
    const match = pattern === undefined ? undefined : new RegExp(pattern, 'i')
    const saved = position.safeParse(context.state)
    const run = serial()

    const atEnd = async (): Promise<Position> => {
      const info = await fileInfo(path)
      return info ? { offset: info.size, ino: Number(info.ino) } : { offset: 0 }
    }

    let at = saved.success ? saved.data : await atEnd()
    if (!saved.success) context.save(at)

    const settle = (next: Position) => {
      at = next
      context.save(next)
    }

    const check = async () => {
      const info = await fileInfo(path)
      if (!info) {
        if (at.offset) settle({ offset: 0 })
        return
      }
      const ino = Number(info.ino)
      const replaced = info.size < at.offset || (at.ino !== undefined && at.ino !== ino)
      const from = replaced ? 0 : at.offset
      if (info.size === from) {
        if (replaced) settle({ offset: 0, ino })
        return
      }
      const { lines, next } = await readLines(path, from, info.size)
      settle({ offset: next, ino })
      const kept = match ? lines.filter(line => match.test(line)) : lines
      if (kept.length) context.emit(changeOf(path, kept, Boolean(match), info.mtimeMs))
    }

    const changed = () => void run(check).catch(error => context.fail(error))
    const name = basename(path)
    const unwatch = watcher.debounced(folder, { only: file => !file || basename(file) === name }, changed)
    const timer = setInterval(changed, everyMs)
    if (saved.success) changed()
    return {
      stop: () => {
        clearInterval(timer)
        unwatch()
      },
    }
  },
})
