import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { locate } from './files'
import { walk } from './search/walk'

const limit = 1000

const input = z.object({
  pattern: z.string().describe('Glob pattern, e.g. "src/**/*.ts"'),
  path: z.string().optional().describe('Directory to search from (default: working directory)'),
  include_ignored: z.boolean().optional().describe('Also find gitignored files and node_modules'),
})

export const glob: Tool<typeof input> = {
  name: 'glob',
  description: 'Find files by glob pattern. Skips gitignored files, node_modules and .git unless include_ignored is set.',
  input,
  async run({ pattern, path = '.', include_ignored }, { cwd, signal }) {
    const files: string[] = []
    for await (const file of walk(pattern, locate(cwd, path), include_ignored, signal)) {
      files.push(file)
      if (files.length >= limit) break
    }
    if (!files.length) return 'No files found'
    return files.sort().join('\n') + (files.length >= limit ? `\n… stopped at ${limit} files` : '')
  },
}
