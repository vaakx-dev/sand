import type { OutlineItem } from '@sand/orrin/contract'
import { z } from 'zod'
import type { MakeTool, Scope } from '../scope'

const input = z.object({ path: z.string().describe('File path, relative to the working directory or absolute') })

export const outlineOf = async (scope: Scope, path: string, signal?: AbortSignal) =>
  (await scope.orrin.call('outline', { project: scope.project, view: scope.view, path }, signal)).items

const itemLine = (item: OutlineItem) => `${'  '.repeat(item.depth)}${item.line ?? '-'}\t${item.kind} ${item.name}`

export const outlineTool = (tool: MakeTool) =>
  tool({
    name: 'outline',
    description:
      'Outline a file: code symbols, markdown or document headings, slides, sheets or scene nodes, with line numbers. Use the names as read anchors.',
    input,
    async run({ path }, scope, { signal }) {
      const file = scope.projectPath(path)
      if (!file) throw new Error(`${path} is outside the project; Orrin can only outline project files`)
      const items = await outlineOf(scope, file, signal)
      return items.length ? items.map(itemLine).join('\n') : `No outline for ${path}`
    },
  })
