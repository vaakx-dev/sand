import type { Tool } from '@sand/protocol'
import { z } from 'zod'
import { locate, walk } from './files'

const limit = 1000

const input = z.object({
  pattern: z.string().describe('Glob pattern, e.g. "src/**/*.ts"'),
  path: z.string().optional().describe('Directory to search from (default: working directory)'),
})

export const glob: Tool<typeof input> = {
  name: 'glob',
  description: 'Find files by glob pattern. Skips node_modules and .git.',
  input,
  async run({ pattern, path = '.' }, { cwd }) {
    const files: string[] = []
    for await (const file of walk(pattern, locate(cwd, path))) {
      files.push(file)
      if (files.length >= limit) break
    }
    if (!files.length) return 'No files found'
    return files.sort().join('\n') + (files.length >= limit ? `\n… stopped at ${limit} files` : '')
  },
}
