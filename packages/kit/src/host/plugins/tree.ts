import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PluginTree } from '@sand/host-plugin-sync/contract'
import { fileHash, treeHash } from './hash'
import { validPluginName } from './names'
import { pluginFiles } from './walk'

export const scanPlugin = async (folder: string): Promise<PluginTree> => {
  const files: Record<string, string> = {}
  for (const path of await pluginFiles(folder)) {
    files[path] = fileHash(await Bun.file(join(folder, ...path.split('/'))).bytes())
  }
  return { hash: treeHash(files), files }
}

const linkedFolder = (path: string) =>
  stat(path).then(
    info => info.isDirectory(),
    () => false,
  )

const pluginFolders = async (root: string) => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  const names: string[] = []
  const linked = new Set<string>()
  for (const entry of entries) {
    if (!validPluginName(entry.name)) continue
    if (entry.isDirectory()) names.push(entry.name)
    else if (entry.isSymbolicLink() && (await linkedFolder(join(root, entry.name)))) {
      names.push(entry.name)
      linked.add(entry.name)
    }
  }
  return { names, linked }
}

export interface PluginScan {
  trees: Record<string, PluginTree>
  linked: Set<string>
}

export const scanPlugins = async (root: string): Promise<PluginScan> => {
  const { names, linked } = await pluginFolders(root)
  const trees = await Promise.all(names.map(name => scanPlugin(join(root, name))))
  return { trees: Object.fromEntries(names.map((name, index) => [name, trees[index]!])), linked }
}
