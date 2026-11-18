import type { Tool } from '@sand/tools/contract'
import { plural } from '@sand/util'
import { resolve } from 'node:path'
import { z } from 'zod'
import { atLine } from './at-line'
import { decode, encode, exclusive, readBytes, type Text } from './files'

const change = z.object({
  path: z.string().describe('File path, absolute or relative to the working directory'),
  old_string: z.string().min(1).describe('Exact text to replace'),
  new_string: z.string().describe('Replacement text'),
  replace_all: z.boolean().optional().describe('Replace every occurrence instead of requiring a unique match'),
})

const input = z.object({
  edits: z
    .array(change)
    .min(1)
    .describe('Every change to make, across any number of files. Changes to the same file apply in order, each to the result of the one before.'),
})

type Change = z.infer<typeof change> & { full: string }

interface File extends Text {
  original: Uint8Array
}

const matchEndings = (text: string, content: string) =>
  content.includes('\r\n') && !text.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text

const lineAt = (content: string, index: number) => content.slice(0, index).split('\n').length

const problem = (count: number, { path, replace_all }: Change) => {
  if (count === 0) return `old_string not found in ${path}`
  if (count > 1 && !replace_all) return `old_string matches ${count} times in ${path}; add context or set replace_all`
}

const replaceIn = (content: string, edit: Change) => {
  const target = matchEndings(edit.old_string, content)
  const count = content.split(target).length - 1
  const error = problem(count, edit)
  if (error) return { error }
  const replacement = matchEndings(edit.new_string, content)
  const next = edit.replace_all ? content.replaceAll(target, replacement) : content.replace(target, () => replacement)
  const summary =
    count > 1
      ? `Replaced ${plural(count, 'occurrence')} in ${edit.path}`
      : `Replaced 1 occurrence in ${edit.path}${atLine(lineAt(content, content.indexOf(target)))}`
  return { next, summary }
}

const readAll = async (paths: string[]) => {
  const originals = await Promise.all(paths.map(readBytes))
  return new Map(paths.map((path, index): [string, File] => [path, { original: originals[index]!, ...decode(originals[index]!) }]))
}

const applyAll = (changes: Change[], files: Map<string, File>) =>
  changes.map((edit, index) => {
    const file = files.get(edit.full)!
    const result = replaceIn(file.content, edit)
    if (result.error === undefined) {
      file.content = result.next
      return result.summary
    }
    const which = changes.length > 1 ? `Edit ${index + 1} of ${changes.length}: ` : ''
    throw new Error(`${which}${result.error}. No files were changed.`)
  })

const encodeAll = (files: Map<string, File>) =>
  [...files].map(([path, file]): [string, Uint8Array] => {
    const encoded = encode(file)
    if (encoded.error === undefined) return [path, encoded.bytes]
    throw new Error(`Can't save ${path}: ${encoded.error}. No files were changed.`)
  })

const writeAll = async (files: Map<string, File>) => {
  const written: string[] = []
  try {
    for (const [path, bytes] of encodeAll(files)) {
      await Bun.write(path, bytes)
      written.push(path)
    }
  } catch (error) {
    await Promise.all(written.map(path => Bun.write(path, files.get(path)!.original)))
    throw error
  }
}

const holdingAll = <T>(paths: string[], task: () => Promise<T>) =>
  paths.toSorted().reduceRight((inner, path) => () => exclusive(path, inner), task)()

const editAll = async (changes: Change[], paths: string[]) => {
  const files = await readAll(paths)
  const summaries = applyAll(changes, files)
  await writeAll(files)
  return summaries.join('\n')
}

export const edit: Tool<typeof input> = {
  name: 'edit',
  description: [
    'Replace exact text in files. One call carries every change you need: list them all in `edits`, across as many files as you like, instead of making one call per change.',
    'Each old_string must match exactly once in its file, unless replace_all is set. Line endings follow the file.',
    'All changes apply or none do: if any one fails, no file is changed. Read the files first.',
  ].join(' '),
  input,
  needs: ['pc'],
  act: ({ edits }) => {
    const paths = [...new Set(edits.map(edit => edit.path))]
    return { effect: 'write', paths, summary: `Edit ${paths.join(', ')}` }
  },
  run({ edits }, { cwd }) {
    const changes = edits.map(edit => ({ ...edit, full: resolve(cwd, edit.path) }))
    const paths = [...new Set(changes.map(edit => edit.full))]
    return holdingAll(paths, () => editAll(changes, paths))
  },
}
