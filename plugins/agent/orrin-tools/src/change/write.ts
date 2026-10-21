import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({
  path: z.string().describe('File path, relative to the working directory or absolute'),
  content: z.string().describe('Full file contents'),
})

export const writeTool = (tool: MakeTool) =>
  tool({
    name: 'write',
    description:
      "Create or overwrite a file. Project files go through Orrin into this chat's view of the project; others are written straight to disk.",
    input,
    replaces: ['write'],
    async run({ path, content }, scope, { signal }) {
      const file = scope.projectPath(path)
      if (!file) {
        const full = scope.diskPath(path)
        return `Wrote ${full} (${await Bun.write(full, content)} bytes)`
      }
      const where = { project: scope.project, view: scope.view, path: file }
      const written = await scope.orrin.call('create', { ...where, content, overwrite: true }, signal)
      return `Wrote ${written.path} (${written.size} bytes)`
    },
  })
