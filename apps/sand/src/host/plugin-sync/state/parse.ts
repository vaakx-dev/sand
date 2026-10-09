import type { PluginFile, PluginFiles, PluginManifest, PluginTree } from '@sand/protocol'
import { safeRelative, validPluginName } from '../names'

const record = (value: unknown, what: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${what} is not an object`)
  return value as Record<string, unknown>
}

const text = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || !value) throw new Error(`${what} is missing`)
  return value
}

const hex = (value: unknown, what: string): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{16,128}$/i.test(value)) throw new Error(`${what} is not a valid hash`)
  return value.toLowerCase()
}

const pluginName = (value: unknown): string => {
  const name = text(value, 'Plugin name')
  if (!validPluginName(name)) throw new Error(`Invalid plugin name ${name}`)
  return name
}

const filePath = (value: unknown): string => {
  const path = text(value, 'File path')
  if (!safeRelative(path)) throw new Error(`Unsafe file path ${path}`)
  return path
}

const parseTree = (value: unknown, name: string): PluginTree => {
  const tree = record(value, `Plugin ${name}`)
  const files = Object.fromEntries(
    Object.entries(record(tree.files, `Files of ${name}`)).map(([path, hash]) => [
      filePath(path),
      hex(hash, `Hash of ${name}/${path}`),
    ]),
  )
  return { hash: hex(tree.hash, `Hash of ${name}`), files }
}

export const parseManifest = (value: unknown): PluginManifest => {
  const manifest = record(value, 'Plugin manifest')
  const plugins = Object.fromEntries(
    Object.entries(record(manifest.plugins, 'Plugin list')).map(([name, tree]) => [
      pluginName(name),
      parseTree(tree, name),
    ]),
  )
  if (!Array.isArray(manifest.local)) throw new Error('Local plugin list is not a list')
  return { device: text(manifest.device, 'Device id'), plugins, local: manifest.local.map(pluginName) }
}

const parseFile = (value: unknown): PluginFile => {
  const file = record(value, 'Plugin file')
  if (typeof file.data !== 'string') throw new Error('File data is missing')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) throw new Error('File data is not base64')
  return { path: filePath(file.path), data: file.data, executable: file.executable === true }
}

export const parseFiles = (value: unknown): PluginFiles => {
  const files = record(value, 'Plugin files')
  if (!Array.isArray(files.files)) throw new Error('File list is not a list')
  const list = files.files.map(parseFile)
  const paths = new Set(list.map(file => file.path))
  if (paths.size !== list.length) throw new Error('File list has duplicate paths')
  return { plugin: pluginName(files.plugin), hash: hex(files.hash, 'Plugin hash'), files: list }
}
