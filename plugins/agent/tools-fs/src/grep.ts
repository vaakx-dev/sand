import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import { timedOut, timeoutNote, withDeadline } from './search/deadline'
import { matches } from './search/matches'

const limit = 200

const input = z.object({
  pattern: z.string().describe('Regular expression'),
  path: z.string().optional().describe('File or directory to search (default: working directory)'),
  glob: z.string().optional().describe('Only search files matching this glob, e.g. "**/*.ts"'),
  ignore_case: z.boolean().optional(),
  include_ignored: z.boolean().optional().describe('Also search gitignored files and node_modules'),
})

export const grep: Tool<typeof input> = {
  name: 'grep',
  description:
    'Search file contents with a regular expression. Returns file:line: text. Skips gitignored files, node_modules, .git and binary files unless include_ignored is set.',
  input,
  async run({ pattern, path = '.', glob = '**/*', ignore_case, include_ignored }, { cwd, signal }) {
    const found: string[] = []
    const query = { pattern, root: resolve(cwd, path), glob, ignoreCase: ignore_case, includeIgnored: include_ignored, signal: withDeadline(signal) }
    try {
      for await (const match of matches(query)) {
        found.push(match)
        if (found.length >= limit) return found.join('\n') + `\n… stopped at ${limit} matches`
      }
    } catch (error) {
      if (!timedOut(error)) throw error
      return [...found, timeoutNote].join('\n')
    }
    return found.length ? found.join('\n') : 'No matches'
  },
}
