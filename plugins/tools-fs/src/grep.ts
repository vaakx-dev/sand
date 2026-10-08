import type { Tool } from '@sand/protocol'
import { basename, join } from 'node:path'
import { z } from 'zod'
import { isDirectory, locate, walk } from './files'

const limit = 200
const maxSize = 1_000_000

const input = z.object({
  pattern: z.string().describe('JavaScript regular expression'),
  path: z.string().optional().describe('File or directory to search (default: working directory)'),
  glob: z.string().optional().describe('Only search files matching this glob, e.g. "**/*.ts"'),
  ignore_case: z.boolean().optional(),
})

const files = async function* (root: string, pattern: string) {
  if (await isDirectory(root)) {
    for await (const file of walk(pattern, root)) yield { full: join(root, file), shown: file }
  } else {
    yield { full: root, shown: basename(root) }
  }
}

export const grep: Tool<typeof input> = {
  name: 'grep',
  description: 'Search file contents with a regular expression. Returns file:line: text. Skips node_modules, .git and binary files.',
  input,
  async run({ pattern, path = '.', glob = '**/*', ignore_case }, { cwd, signal }) {
    const regex = new RegExp(pattern, ignore_case ? 'i' : '')
    const matches: string[] = []
    for await (const { full, shown } of files(locate(cwd, path), glob)) {
      signal.throwIfAborted()
      const file = Bun.file(full)
      if (file.size > maxSize) continue
      const text = await file.text()
      if (text.includes('\0')) continue
      const lines = text.split(/\r?\n/)
      for (const [index, line] of lines.entries()) {
        if (!regex.test(line)) continue
        matches.push(`${shown}:${index + 1}: ${line.trim().slice(0, 300)}`)
        if (matches.length >= limit) return matches.join('\n') + `\n… stopped at ${limit} matches`
      }
    }
    return matches.length ? matches.join('\n') : 'No matches'
  },
}
