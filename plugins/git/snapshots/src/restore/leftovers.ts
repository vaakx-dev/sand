import type { GitRunner } from '@sand/git/contract'
import { isInside } from '@sand/util'
import { existsSync, readdirSync, rmdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { snapshotFiles, untrackedFiles } from '../git/lists'

const removeEmptyFolders = (root: string, files: string[]) => {
  const folders = [...new Set(files.map(file => dirname(join(root, file))))].sort((a, b) => b.length - a.length)
  for (const folder of folders) {
    for (let at = folder; isInside(at, root); at = dirname(at)) {
      if (!existsSync(at)) continue
      if (readdirSync(at).length) break
      rmdirSync(at)
    }
  }
}

export const removeLeftovers = async (git: GitRunner, root: string, saved: string) => {
  const captured = new Set(await snapshotFiles(git, root, saved))
  const leftovers = (await untrackedFiles(git, root)).filter(path => captured.has(path))
  for (const path of leftovers) await rm(join(root, path), { force: true })
  removeEmptyFolders(root, leftovers)
}
