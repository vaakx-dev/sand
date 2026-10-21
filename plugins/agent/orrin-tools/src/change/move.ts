import { mkdir, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { MakeTool } from '../scope'

const input = z.object({
  from: z.string().describe('Current file path'),
  to: z.string().describe('New file path'),
})

const moveDisk = async (from: string, to: string) => {
  await mkdir(dirname(to), { recursive: true })
  await rename(from, to)
  return `Moved ${from} to ${to}`
}

export const moveTool = (tool: MakeTool) =>
  tool({
    name: 'move',
    description:
      "Move or rename a file. Project files go through Orrin in this chat's view of the project; others are moved straight on disk.",
    input,
    async run({ from, to }, scope, { signal }) {
      const [source, target] = [scope.projectPath(from), scope.projectPath(to)]
      if (!source && !target) return moveDisk(scope.diskPath(from), scope.diskPath(to))
      if (!source || !target) throw new Error('Moving between the project and outside it is not supported; use write and delete')
      await scope.orrin.call('move', { project: scope.project, view: scope.view, from: source, to: target }, signal)
      return `Moved ${source} to ${target}`
    },
  })
