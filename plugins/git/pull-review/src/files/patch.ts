import type { DiffHunks, DiffPatch } from '@sand/git-diff/contract'
import { type GitHub, pullLabel } from '@sand/github/contract'
import { shortSha } from '@sand/util'
import { type FileSource, findFile, isBinary, movedFrom } from './rest'

export interface PatchDeps {
  github: GitHub
  hunks(): DiffHunks | undefined
}

export const readPatch = async (deps: PatchDeps, source: FileSource, path: string): Promise<DiffPatch> => {
  const file = await findFile(deps.github, source, path)
  if (!file) throw new Error(`${path} isn't among the files changed in ${source.commit ? shortSha(source.commit) : pullLabel(source)}.`)
  const named = { path, ...movedFrom(file) }
  if (file.patch === undefined) {
    if (isBinary(file)) return { ...named, hunks: [], binary: true }
    return file.changes > 0 ? { ...named, hunks: [], tooLarge: true } : { ...named, hunks: [] }
  }
  const parser = deps.hunks()
  if (!parser) throw new Error('Showing a file\'s changes needs the Git diff plugin. Turn it on in Settings.')
  return { ...named, hunks: parser.parse(file.patch) }
}
