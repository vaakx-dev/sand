import { z } from 'zod'
import type { MakeTool } from '../scope'

const edit = z.object({
  old: z.string().min(1).describe('Exact text to replace; must match once unless all is set'),
  new: z.string().describe('Replacement text'),
  all: z.boolean().optional().describe('Replace every occurrence'),
})

const input = z.object({
  path: z.string().describe('File path, relative to the working directory or absolute'),
  edits: z.array(edit).min(1).describe('Edits applied in order'),
})

type Edit = z.infer<typeof edit>

const matchEndings = (text: string, content: string) =>
  content.includes('\r\n') && !text.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text

const applyEdit = (content: string, { old, new: replacement, all }: Edit) => {
  const target = matchEndings(old, content)
  const count = content.split(target).length - 1
  if (count === 0) throw new Error(`Text not found: ${old.slice(0, 200)}`)
  if (count > 1 && !all) throw new Error(`Text matches ${count} times; add context or set all: ${old.slice(0, 200)}`)
  const next = matchEndings(replacement, content)
  return all ? content.replaceAll(target, next) : content.replace(target, () => next)
}

const patchDisk = async (full: string, edits: Edit[]) => {
  const content = edits.reduce(applyEdit, await Bun.file(full).text())
  return { path: full, size: await Bun.write(full, content) }
}

export const patchTool = (tool: MakeTool) =>
  tool({
    name: 'patch',
    description:
      "Replace exact text in a file. Project files go through Orrin into this chat's view of the project; others are changed straight on disk.",
    input,
    replaces: ['edit'],
    async run({ path, edits }, scope, { signal }) {
      const file = scope.projectPath(path)
      const written = file
        ? await scope.orrin.call('patch', { project: scope.project, view: scope.view, path: file, edits }, signal)
        : await patchDisk(scope.diskPath(path), edits)
      return `Patched ${written.path} (${edits.length} edit${edits.length === 1 ? '' : 's'}, ${written.size} bytes)`
    },
  })
