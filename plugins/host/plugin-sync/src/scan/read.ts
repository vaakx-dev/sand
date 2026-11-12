import { readPluginFiles, treeHash, validPluginName } from '@sand/plugin-files'
import { fileHash, isFolder } from '@sand/util/fs'
import { join } from 'node:path'
import type { PluginFiles } from '../contract'

const LIMIT_BYTES = 48 * 1024 * 1024

export const readPlugin = async (root: string, plugin: string): Promise<PluginFiles> => {
  const folder = join(root, plugin)
  if (!validPluginName(plugin) || !(await isFolder(folder))) throw new Error(`Unknown plugin ${plugin}`)
  const files = await readPluginFiles(folder)
  const total = files.reduce((sum, file) => sum + file.bytes.byteLength, 0)
  if (total > LIMIT_BYTES) throw new Error(`${plugin} is too big to share (over 48 MB)`)
  const hashes = Object.fromEntries(files.map(file => [file.path, fileHash(file.bytes)]))
  return {
    plugin,
    hash: treeHash(hashes),
    files: files.map(({ path, bytes, executable }) => ({ path, data: Buffer.from(bytes).toString('base64'), executable })),
  }
}
