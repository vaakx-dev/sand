import { exists, isLink, removeQuietly, stagingFolder, validPluginName } from '@sand/kit/host'
import { rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

export const removePlugin = async (root: string, work: string, plugin: string): Promise<void> => {
  if (!validPluginName(plugin)) throw new Error(`Invalid plugin name: ${plugin}`)
  const target = join(root, plugin)
  if (!(await exists(target))) return
  if (await isLink(target)) throw new Error(`${plugin} is a linked folder on this PC; it is not synced`)
  const trash = await stagingFolder(work, 'trash')
  try {
    await rename(target, join(trash, plugin))
  } catch {
    await rm(target, { recursive: true, force: true })
  }
  await removeQuietly(trash)
}
