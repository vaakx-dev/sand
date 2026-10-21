import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({
  pattern: z.string().describe('File name or path pattern, e.g. "main.rs", "src/**/*.ts" or "player"'),
  limit: z.number().int().positive().optional().describe('Maximum number of files (default 200)'),
})

export const findTool = (tool: MakeTool) =>
  tool({
    name: 'find',
    description: "Find files in the project by name or path pattern, from Orrin's index. Returns paths with sizes.",
    input,
    replaces: ['glob'],
    environment:
      'This project is in Orrin. Use find, search, read, outline and where to look at files instead of scanning the disk with shell (ls, dir, find, grep, rg). Change files with patch, write, move and delete. Use build, run, test, screenshot and export for the targets in orrin.toml. Keep shell for other commands.',
    async run({ pattern, limit = 200 }, scope, { signal }) {
      const { files, truncated } = await scope.orrin.call('find', { project: scope.project, view: scope.view, pattern, limit }, signal)
      if (!files.length) return `No files match "${pattern}"`
      const lines = files.map(file => `${file.path} (${file.size} bytes)`)
      return lines.join('\n') + (truncated ? '\n… more files match; narrow the pattern' : '')
    },
  })
