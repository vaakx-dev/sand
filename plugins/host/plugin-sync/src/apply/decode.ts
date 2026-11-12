import { type PluginFile, treeHash } from '@sand/plugin-files'
import { fileHash } from '@sand/util/fs'
import type { PluginFiles } from '../contract'

export const decode = ({ plugin, hash, files }: PluginFiles): PluginFile[] => {
  const decoded = files.map(file => ({ path: file.path, bytes: new Uint8Array(Buffer.from(file.data, 'base64')), executable: file.executable }))
  const hashes = Object.fromEntries(decoded.map(file => [file.path, fileHash(file.bytes)]))
  if (Object.keys(hashes).length !== decoded.length || treeHash(hashes) !== hash) throw new Error(`${plugin} arrived damaged; try again`)
  return decoded
}
