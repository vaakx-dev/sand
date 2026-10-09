import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { locate, readText } from './files'
import { exclusive } from './lock'

const input = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  old_string: z.string().min(1).describe('Exact text to replace'),
  new_string: z.string().describe('Replacement text'),
  replace_all: z.boolean().optional().describe('Replace every occurrence instead of requiring a unique match'),
})

const matchEndings = (text: string, content: string) =>
  content.includes('\r\n') && !text.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text

const replace = async (full: string, { path, old_string, new_string, replace_all }: z.infer<typeof input>) => {
  const content = await readText(full)
  const target = matchEndings(old_string, content)
  const count = content.split(target).length - 1
  if (count === 0) throw new Error(`old_string not found in ${path}`)
  if (count > 1 && !replace_all) throw new Error(`old_string matches ${count} times in ${path}; add context or set replace_all`)
  const replacement = matchEndings(new_string, content)
  await Bun.write(full, replace_all ? content.replaceAll(target, replacement) : content.replace(target, () => replacement))
  return `Replaced ${replace_all ? count : 1} occurrence${count > 1 && replace_all ? 's' : ''} in ${path}`
}

export const edit: Tool<typeof input> = {
  name: 'edit',
  description:
    'Replace exact text in a file. old_string must match exactly once unless replace_all is set. Read the file first.',
  input,
  run(args, { cwd }) {
    const full = locate(cwd, args.path)
    return exclusive(full, () => replace(full, args))
  },
}
