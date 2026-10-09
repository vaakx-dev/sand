import { chmod, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { hostPaths } from '@sand/kit'
import { executableList, installDependencies, safeRelative, validPluginName } from '@sand/kit/host'

interface CopyPluginsOptions {
  base: string
  secret: string
  home: string
}

interface CopiedPlugins {
  copied: string[]
  kept: string[]
  folder: string
}

const downloadTimeout = 120_000

const download = async ({ base, secret }: CopyPluginsOptions): Promise<Uint8Array | undefined> => {
  const url = `${base}${hostPaths.installPlugins}?k=${encodeURIComponent(secret)}`
  const response = await fetch(url, { signal: AbortSignal.timeout(downloadTimeout) })
  if (response.status === 204) return undefined
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).trim() || `HTTP ${response.status}`
    throw new Error(`could not download the plugins: ${detail}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

const splitEntry = (name: string): [string, string] => {
  const slash = name.indexOf('/')
  const plugin = slash > 0 ? name.slice(0, slash) : ''
  const path = name.slice(slash + 1)
  if (slash <= 0 || !validPluginName(plugin) || !safeRelative(path)) throw new Error(`unsafe plugin file in download: ${name}`)
  return [plugin, path]
}

interface CopiedFile {
  blob: Blob
  executable: boolean
}

const groupByPlugin = async (bytes: Uint8Array) => {
  const entries = await new Bun.Archive(bytes).files()
  const executable = new Set((await entries.get(executableList)?.text())?.split('\n') ?? [])
  entries.delete(executableList)
  const plugins = new Map<string, Map<string, CopiedFile>>()
  for (const [name, blob] of entries) {
    const [plugin, path] = splitEntry(name)
    const files = plugins.get(plugin) ?? new Map<string, CopiedFile>()
    files.set(path, { blob, executable: executable.has(name) })
    plugins.set(plugin, files)
  }
  return plugins
}

const writeFile = async (path: string, file: CopiedFile) => {
  await Bun.write(path, file.blob)
  if (process.platform !== 'win32') await chmod(path, file.executable ? 0o755 : 0o644)
}

const exists = (path: string) => stat(path).then(() => true, () => false)

export const copyPlugins = async (options: CopyPluginsOptions): Promise<CopiedPlugins> => {
  const folder = join(options.home, 'plugins')
  const bytes = await download(options)
  if (!bytes) return { copied: [], kept: [], folder }
  const copied: string[] = []
  const kept: string[] = []
  for (const [plugin, files] of await groupByPlugin(bytes)) {
    const target = join(folder, plugin)
    if (await exists(target)) {
      kept.push(plugin)
      continue
    }
    for (const [path, file] of files) await writeFile(join(target, ...path.split('/')), file)
    copied.push(plugin)
  }
  for (const plugin of copied) await installDependencies(join(folder, plugin))
  return { copied, kept, folder }
}
