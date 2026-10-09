import { carryOver, copyPlugin, exists, isLink, removeQuietly, unsharedPaths } from '@sand/kit/host'
import { mkdir, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { contentAt } from './content'
import type { TargetInfo } from './targets'

const stage = async (staging: string) => {
  const folder = join(staging, Bun.randomUUIDv7())
  await mkdir(folder, { recursive: true })
  return folder
}

const swapFolder = async (info: TargetInfo, incoming: string, trash: string) => {
  const moved: string[] = []
  const live = await exists(info.path)
  if (live) await carryOver(info.path, incoming, await unsharedPaths(info.path), moved)
  try {
    if (live) await rename(info.path, trash)
    await rename(incoming, info.path)
  } catch (error) {
    if (live && !(await exists(info.path))) await rename(trash, info.path).catch(() => {})
    if (moved.length) await carryOver(incoming, info.path, moved, []).catch(() => {})
    throw error
  }
}

export const replaceTarget = async (info: TargetInfo, version: string | undefined, staging: string) => {
  if (await isLink(info.path)) throw new Error(`${info.name} is a linked folder on this PC; it has no history here`)
  const work = await stage(staging)
  try {
    await mkdir(dirname(info.path), { recursive: true })
    const trash = join(work, 'trash')
    if (!version) return void (await rename(info.path, trash).catch(() => {}))
    const incoming = join(work, 'incoming')
    if (!info.folder) {
      await Bun.write(incoming, Bun.file(contentAt(info, version)))
      return void (await rename(incoming, info.path))
    }
    await copyPlugin(version, incoming)
    await swapFolder(info, incoming, trash)
  } finally {
    await removeQuietly(work)
  }
}
