import type { DiffPatch, DiffScope } from '../contract'
import type { DiffGit } from '../git'
import { diffArgs, readRange } from '../scope/read'
import { resolveScope } from '../scope/resolve'
import { parsePatch } from './parse'

const maxLines = 20_000
const maxChars = 1024 * 1024

export interface PatchRequest {
  cwd: string
  scope: DiffScope
  path: string
  from?: string
}

const size = (lines: string[]) => lines.reduce((sum, line) => sum + line.length + 1, 0)

export const readPatch = async (tools: DiffGit, { cwd, scope, path, from }: PatchRequest): Promise<DiffPatch> => {
  const { git } = tools
  const range = await resolveScope(tools, cwd, scope)
  const renamed = from && from !== path ? from : undefined
  const paths = renamed ? [renamed, path] : [path]
  const args = diffArgs(range, ['--patch'], paths)
  const { value: output } = await readRange(git, range, paths, env => git.lines(range.repo.root, args, maxLines, { env, read: true }))
  if (output.code !== 0) throw new Error(git.classify({ code: output.code, out: '', err: output.err }, args).message)
  const named = { path, ...(renamed ? { from: renamed } : {}) }
  if (output.lines.length >= maxLines || size(output.lines) > maxChars) return { ...named, hunks: [], tooLarge: true }
  const { hunks, binary } = parsePatch(output.lines)
  return binary ? { ...named, hunks: [], binary: true } : { ...named, hunks }
}
