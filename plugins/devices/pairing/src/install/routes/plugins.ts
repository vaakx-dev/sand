import type { HttpRoute } from '@sand/host-gateway/contract'
import { executableList, readPluginFiles } from '@sand/plugin-files'
import { join } from 'node:path'
import type { Installs } from '../installs'
import { expired, installToken } from './token'

interface PluginsRouteOptions {
  home: string
  installs: Pick<Installs, 'check' | 'step'>
  shared: () => Promise<string[]>
}

const pluginEntries = async (folder: string, plugins: string[]) => {
  const entries: Record<string, Uint8Array | string> = {}
  const executable: string[] = []
  for (const plugin of plugins) {
    for (const file of await readPluginFiles(join(folder, plugin))) {
      const name = `${plugin}/${file.path}`
      entries[name] = file.bytes
      if (file.executable) executable.push(name)
    }
  }
  if (executable.length) entries[executableList] = executable.join('\n')
  return entries
}

export const pluginsRoute = ({ home, installs, shared }: PluginsRouteOptions): HttpRoute => ({
  method: 'GET',
  async handle(call) {
    const token = installToken(call)
    if (!token || !installs.check(token)) return expired()
    const plugins = await shared()
    if (plugins.length === 0) return new Response(null, { status: 204, headers: { 'x-sand-plugins': '0' } })
    const archive = new Bun.Archive(await pluginEntries(join(home, 'plugins'), plugins), { compress: 'gzip' })
    const bytes = await archive.bytes()
    installs.step(token, 'plugins', { plugins: plugins.length })
    return new Response(bytes, {
      headers: {
        'content-type': 'application/gzip',
        'cache-control': 'no-store',
        'x-sand-plugins': String(plugins.length),
      },
    })
  },
})
