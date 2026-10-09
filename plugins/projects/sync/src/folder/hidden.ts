import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { git, gitOut, type GitOptions, type GitResult } from '../git/run'
import { isDirectory } from './stat'

export interface Hidden {
  folder: string
  dir: string
  gitDir: string
  env: Record<string, string>
}

export const hiddenFor = (home: string, folder: string): Hidden => {
  const dir = join(home, 'sync', new Bun.CryptoHasher('sha1').update(folder).digest('hex'))
  const gitDir = join(dir, 'repo.git')
  return { folder, dir, gitDir, env: { GIT_DIR: gitDir, GIT_WORK_TREE: folder, GIT_INDEX_FILE: join(dir, 'index') } }
}

const workingDirectory = async (hidden: Hidden) => {
  if (await isDirectory(hidden.folder)) return hidden.folder
  await mkdir(hidden.dir, { recursive: true })
  return hidden.dir
}

const options = async (hidden: Hidden, extra: GitOptions = {}): Promise<GitOptions> => ({
  ...extra,
  cwd: extra.cwd ?? (await workingDirectory(hidden)),
  env: { ...hidden.env, ...extra.env },
})

export const hiddenGit = async (hidden: Hidden, args: string[], extra?: GitOptions): Promise<GitResult> => git(args, await options(hidden, extra))

export const hiddenOut = async (hidden: Hidden, args: string[], extra?: GitOptions) => gitOut(args, await options(hidden, extra))

export const hiddenLine = async (hidden: Hidden, args: string[], extra?: GitOptions) => (await hiddenOut(hidden, args, extra)).trim()

export const initHidden = async (hidden: Hidden) => {
  if (await Bun.file(join(hidden.gitDir, 'HEAD')).exists()) return
  await mkdir(hidden.dir, { recursive: true })
  await gitOut(['init', '--bare', '--quiet', hidden.gitDir], { cwd: hidden.dir })
  await gitOut(['config', 'core.bare', 'false'], { env: { GIT_DIR: hidden.gitDir } })
}
