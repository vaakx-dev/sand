import { copyPlugin, fileHash, scanPlugin, treeHash } from '@sand/kit/host'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { TargetInfo } from './targets'

export const contentAt = (info: TargetInfo, folder: string) => (info.folder ? folder : join(folder, info.name))

export const contentHash = async (info: TargetInfo, path: string) => {
  if (info.folder) return (await scanPlugin(path)).hash
  return treeHash({ [info.name]: fileHash(await Bun.file(path).bytes()) })
}

export const copyContent = async (info: TargetInfo, from: string, to: string) => {
  if (info.folder) return copyPlugin(from, to)
  await mkdir(to, { recursive: true })
  await Bun.write(join(to, info.name), Bun.file(from))
}
