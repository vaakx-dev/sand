import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import { timedOut, timeoutNote, withDeadline } from './search/deadline'
import { matches, outputs } from './search/matches'
import type { Ripgrep } from './search/ripgrep'

const limit = 200

const MAX_CONTEXT_LINES = 20

const input = z.object({
  pattern: z.string().describe('Regular expression'),
  path: z.string().optional().describe('File or directory to search (default: working directory)'),
  glob: z.string().optional().describe('Only search files matching this glob, e.g. "**/*.ts"'),
  output: z
    .enum(outputs)
    .optional()
    .describe('lines (default): matching lines with line numbers; files: only the names of files that match; count: matches per file'),
  context: z.number().int().min(0).max(MAX_CONTEXT_LINES).optional().describe('Lines to show before and after each match'),
  ignore_case: z.boolean().optional(),
  include_ignored: z.boolean().optional().describe('Also search gitignored files and node_modules'),
})

export const grepTool = (ripgrep: Ripgrep): Tool<typeof input> => ({
  name: 'grep',
  description:
    'Search file contents with a regular expression. It already skips gitignored files, node_modules, .git and binary files, so there is no need to exclude them.',
  parallel: true,
  input,
  act: ({ pattern, path = '.' }) => ({ effect: 'read', paths: [path], summary: `Search ${path} for ${pattern}` }),
  needs: ['pc'],
  async run({ pattern, path = '.', glob = '**/*', output = 'lines', context = 0, ignore_case, include_ignored }, { cwd, signal }) {
    const found: string[] = []
    const query = {
      binary: await ripgrep(),
      pattern,
      root: resolve(cwd, path),
      glob,
      output,
      context,
      ignoreCase: ignore_case,
      includeIgnored: include_ignored,
      signal: withDeadline(signal),
    }
    try {
      for await (const match of matches(query)) {
        found.push(match)
        if (found.length >= limit) return found.join('\n') + `\n… stopped at ${limit} lines`
      }
    } catch (error) {
      if (!timedOut(error)) throw error
      return [...found, timeoutNote].join('\n')
    }
    return found.length ? found.join('\n') : 'No matches'
  },
})
