import type { GitRunner } from '@sand/git/contract'
import { fileHash } from '@sand/util/fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { projectIconTypes } from './paths'

const iconName = (extension: string) => `icon.${extension}`

const ignoreSandFolder = async (git: GitRunner | undefined, folder: string, icon: string) => {
  if (!git) return
  const { code } = await git.run(folder, ['check-ignore', '-q', `.sand/${icon}`])
  if (code === 1) await Bun.write(join(folder, '.sand', '.gitignore'), '*\n')
}

export const readCopyIcon = async (folder: string) => {
  for (const [extension, type] of Object.entries(projectIconTypes)) {
    const file = Bun.file(join(folder, '.sand', iconName(extension)))
    if (!(await file.exists())) continue
    const bytes = await file.bytes()
    return { bytes, iconFile: { hash: fileHash(bytes), type, updated: file.lastModified } }
  }
  return undefined
}

export const writeCopyIcon = async (git: GitRunner | undefined, folder: string, bytes: Uint8Array, type: string) => {
  const extensions = Object.keys(projectIconTypes)
  const extension = extensions.find(name => projectIconTypes[name] === type)
  if (!extension) return
  const others = extensions.filter(name => name !== extension)
  await Promise.all(others.map(name => rm(join(folder, '.sand', iconName(name)), { force: true })))
  await Bun.write(join(folder, '.sand', iconName(extension)), bytes)
  await ignoreSandFolder(git, folder, iconName(extension))
}
