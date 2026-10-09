import { fileHash, pluginFiles, treeHash, validPluginName } from '@sand/kit/host'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PluginFile, PluginFiles } from '../contract'

const limit = 48 * 1024 * 1024

const isFolder = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

export const readPlugin = async (root: string, plugin: string): Promise<PluginFiles> => {
  const folder = join(root, plugin)
  if (!validPluginName(plugin) || !(await isFolder(folder))) throw new Error(`Unknown plugin ${plugin}`)
  const hashes: Record<string, string> = {}
  const files: PluginFile[] = []
  let total = 0
  for (const path of await pluginFiles(folder)) {
    const full = join(folder, ...path.split('/'))
    const [bytes, info] = await Promise.all([Bun.file(full).bytes(), stat(full)])
    total += bytes.byteLength
    if (total > limit) throw new Error(`${plugin} is too big to share (over 48 MB)`)
    hashes[path] = fileHash(bytes)
    files.push({
      path,
      data: Buffer.from(bytes).toString('base64'),
      executable: process.platform !== 'win32' && (info.mode & 0o111) !== 0,
    })
  }
  return { plugin, hash: treeHash(hashes), files }
}
