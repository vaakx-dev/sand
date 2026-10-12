import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export interface RepoDirs {
  gitDir: string
  commonDir: string
}

const linkedGitDir = async (folder: string, dotGit: string) => {
  const match = /^gitdir:\s*(.+)$/m.exec(await Bun.file(dotGit).text())
  return match?.[1] ? resolve(folder, match[1].trim()) : undefined
}

export const repoDirs = async (folder: string): Promise<RepoDirs | undefined> => {
  const dotGit = join(folder, '.git')
  const info = await stat(dotGit).catch(() => undefined)
  if (!info) return undefined
  const gitDir = info.isDirectory() ? dotGit : await linkedGitDir(folder, dotGit)
  if (!gitDir) return undefined
  const common = (await Bun.file(join(gitDir, 'commondir')).text().catch(() => '')).trim()
  return { gitDir, commonDir: common ? resolve(gitDir, common) : gitDir }
}
