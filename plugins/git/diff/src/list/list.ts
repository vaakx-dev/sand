import type { DiffFile, DiffList, DiffScope } from '../contract'
import { type DiffGit, readOut } from '../git'
import { diffArgs, readRange } from '../scope/read'
import { resolveScope } from '../scope/resolve'
import { parseChanges } from './parse'

const maxFiles = 3000

const changeList = ['--raw', '--numstat', '-z']

const sum = (files: DiffFile[], key: 'add' | 'del') => files.reduce((total, file) => total + file[key], 0)

export const listDiff = async (tools: DiffGit, cwd: string, scope: DiffScope): Promise<DiffList> => {
  const { git } = tools
  const range = await resolveScope(tools, cwd, scope)
  const { value: out, truncated } = await readRange(git, range, [], env => readOut(git, range.repo.root, diffArgs(range, changeList), { env }))
  const files = parseChanges(out)
  const cut = truncated || files.length > maxFiles
  return {
    scope,
    ...(range.base ? { base: range.base } : {}),
    ...(range.baseLabel ? { baseLabel: range.baseLabel } : {}),
    files: files.slice(0, maxFiles),
    total: files.length,
    add: sum(files, 'add'),
    del: sum(files, 'del'),
    ...(cut ? { truncated: true } : {}),
  }
}
