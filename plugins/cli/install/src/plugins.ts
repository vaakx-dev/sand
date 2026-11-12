import { executableList, installDependencies, type PluginFile, writePlugin } from '@sand/plugin-files'
import { exists } from '@sand/util/fs'
import { join } from 'node:path'
import { installPaths } from '@sand/devices-contract'
import { installEndpoint, type JoinGrant } from './remote'

interface CopiedPlugins {
  copied: string[]
  kept: string[]
  folder: string
}

const downloadTimeout = 120_000

const download = async (grant: JoinGrant): Promise<Uint8Array | undefined> => {
  const response = await fetch(installEndpoint(grant, installPaths.plugins), { signal: AbortSignal.timeout(downloadTimeout) })
  if (response.status === 204) return undefined
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).trim() || `HTTP ${response.status}`
    throw new Error(`could not download the plugins: ${detail}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

const splitEntry = (name: string): [string, string] => {
  const slash = name.indexOf('/')
  if (slash <= 0) throw new Error(`unsafe plugin file in download: ${name}`)
  return [name.slice(0, slash), name.slice(slash + 1)]
}

const groupByPlugin = async (bytes: Uint8Array) => {
  const entries = await new Bun.Archive(bytes).files()
  const executable = new Set((await entries.get(executableList)?.text())?.split('\n') ?? [])
  entries.delete(executableList)
  const plugins = new Map<string, PluginFile[]>()
  for (const [name, blob] of entries) {
    const [plugin, path] = splitEntry(name)
    const file = { path, bytes: await blob.bytes(), executable: executable.has(name) }
    plugins.set(plugin, [...(plugins.get(plugin) ?? []), file])
  }
  return plugins
}

export const copyPlugins = async (grant: JoinGrant, home: string): Promise<CopiedPlugins> => {
  const folder = join(home, 'plugins')
  const bytes = await download(grant)
  if (!bytes) return { copied: [], kept: [], folder }
  const copied: string[] = []
  const kept: string[] = []
  for (const [plugin, files] of await groupByPlugin(bytes)) {
    const target = join(folder, plugin)
    if (await exists(target)) {
      kept.push(plugin)
      continue
    }
    await writePlugin({ home, plugin, files })
    copied.push(plugin)
  }
  for (const plugin of copied) await installDependencies(join(folder, plugin))
  return { copied, kept, folder }
}
