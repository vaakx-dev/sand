import { rm } from 'node:fs/promises'
import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({ path: z.string().describe('File path, relative to the working directory or absolute') })

export const deleteTool = (tool: MakeTool) =>
  tool({
    name: 'delete',
    description: "Delete a file. Project files go through Orrin in this chat's view of the project; others are deleted straight from disk.",
    input,
    async run({ path }, scope, { signal }) {
      const file = scope.projectPath(path)
      if (!file) {
        await rm(scope.diskPath(path))
        return `Deleted ${scope.diskPath(path)}`
      }
      const { paths } = await scope.orrin.call('delete', { project: scope.project, view: scope.view, path: file }, signal)
      return `Deleted ${paths.join(', ') || path}`
    },
  })
