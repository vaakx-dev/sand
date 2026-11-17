import { safeRelative, validPluginName } from '@sand/plugin-files'
import { z } from 'zod'
import type { PluginFiles, PluginManifest, PluginTree } from '../contract'

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value)
  if (!result.success) throw new Error(result.error.issues[0]!.message)
  return result.data
}

const text = (what: string) => z.string({ error: `${what} is missing` }).min(1, `${what} is missing`)

const hex = (what: string) =>
  z
    .string({ error: `${what} is not a valid hash` })
    .regex(/^[0-9a-f]{16,128}$/i, `${what} is not a valid hash`)
    .transform(value => value.toLowerCase())

const pluginName = text('Plugin name').refine(validPluginName, { error: issue => `Invalid plugin name ${issue.input}` })

const filePath = text('File path').refine(safeRelative, { error: issue => `Unsafe file path ${issue.input}` })

const treeShape = (name: string) =>
  z.object(
    {
      hash: hex(`Hash of ${name}`),
      files: z.record(z.string(), z.unknown(), { error: `Files of ${name} is not an object` }),
    },
    { error: `Plugin ${name} is not an object` },
  )

const parseTree = (value: unknown, name: string): PluginTree => {
  const tree = parse(treeShape(name), value)
  const files = Object.fromEntries(Object.entries(tree.files).map(([path, hash]) => [parse(filePath, path), parse(hex(`Hash of ${name}/${path}`), hash)]))
  return { hash: tree.hash, files }
}

const manifestShape = z.object(
  {
    device: text('Device id'),
    plugins: z.record(z.string(), z.unknown(), { error: 'Plugin list is not an object' }),
    local: z.array(pluginName, { error: 'Local plugin list is not a list' }),
  },
  { error: 'Plugin manifest is not an object' },
)

export const parseManifest = (value: unknown): PluginManifest => {
  const manifest = parse(manifestShape, value)
  const plugins = Object.fromEntries(Object.entries(manifest.plugins).map(([name, tree]) => [parse(pluginName, name), parseTree(tree, name)]))
  return { device: manifest.device, plugins, local: manifest.local }
}

const fileShape = z.object(
  {
    path: filePath,
    data: z.string({ error: 'File data is missing' }).regex(/^[A-Za-z0-9+/]*={0,2}$/, 'File data is not base64'),
    executable: z.literal(true).optional().catch(undefined).transform(executable => executable === true),
  },
  { error: 'Plugin file is not an object' },
)

const filesShape = z.object(
  {
    plugin: pluginName,
    hash: hex('Plugin hash'),
    files: z.array(fileShape, { error: 'File list is not a list' }),
  },
  { error: 'Plugin files is not an object' },
)

export const parseFiles = (value: unknown): PluginFiles => {
  const files = parse(filesShape, value)
  if (new Set(files.files.map(file => file.path)).size !== files.files.length) throw new Error('File list has duplicate paths')
  return files
}
