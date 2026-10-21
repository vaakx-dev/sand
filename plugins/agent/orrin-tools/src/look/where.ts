import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({
  name: z.string().describe('Symbol name: a function, type, class, method, scene node and so on'),
  kind: z.string().optional().describe('Only this kind of symbol, e.g. "function" or "struct"'),
  limit: z.number().int().positive().optional().describe('Maximum number of places (default 50)'),
})

export const whereTool = (tool: MakeTool) =>
  tool({
    name: 'where',
    description: 'Find where a symbol is defined in the project. Returns path:line, kind and container.',
    input,
    async run({ limit = 50, ...query }, scope, { signal }) {
      const { symbols } = await scope.orrin.call('where', { project: scope.project, view: scope.view, limit, ...query }, signal)
      if (!symbols.length) return `No symbol named "${query.name}"`
      return symbols.map(symbol => `${symbol.path}:${symbol.line} ${symbol.kind} ${symbol.container ? `${symbol.container}::` : ''}${symbol.name}`).join('\n')
    },
  })
