import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({
  query: z.string().describe('Text to search for, or a regular expression when regex is set'),
  regex: z.boolean().optional(),
  case_sensitive: z.boolean().optional(),
  paths: z.string().optional().describe('Only search files matching this glob, e.g. "src/**/*.rs"'),
  limit: z.number().int().positive().optional().describe('Maximum number of matches (default 200)'),
})

export const searchTool = (tool: MakeTool) =>
  tool({
    name: 'search',
    description: "Search file contents in the project through Orrin's index. Returns path:line:column: text.",
    input,
    replaces: ['grep'],
    async run({ limit = 200, ...query }, scope, { signal }) {
      const { hits, truncated } = await scope.orrin.call('search', { project: scope.project, view: scope.view, limit, ...query }, signal)
      if (!hits.length) return `No matches for "${query.query}"`
      const lines = hits.map(hit => `${hit.path}:${hit.line}:${hit.column}:${hit.anchor ? ` [${hit.anchor}]` : ''} ${hit.text.slice(0, 500)}`)
      return lines.join('\n') + (truncated ? '\n… more matches; narrow the query or paths' : '')
    },
  })
