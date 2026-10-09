import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { HttpRoute } from '@sand/protocol'
import { pluginFiles } from '../../plugin-sync/scan/walk'
import { sharedPlugins } from '../../plugin-sync/state/shared'
import type { InstallKeys } from '../installs'
import { executableList, expired, installSecret } from './base'

interface PluginsRouteOptions {
  home: string
  installs: Pick<InstallKeys, 'check' | 'step'>
}

const isExecutable = async (path: string) =>
  process.platform !== 'win32' && ((await stat(path)).mode & 0o111) !== 0

const pluginEntries = async (folder: string, plugins: string[]) => {
  const entries: Record<string, Uint8Array | string> = {}
  const executable: string[] = []
  for (const plugin of plugins) {
    const root = join(folder, plugin)
    for (const path of await pluginFiles(root)) {
      const full = join(root, ...path.split('/'))
      entries[`${plugin}/${path}`] = await Bun.file(full).bytes()
      if (await isExecutable(full)) executable.push(`${plugin}/${path}`)
    }
  }
  if (executable.length) entries[executableList] = executable.join('\n')
  return entries
}

export const pluginsRoute = ({ home, installs }: PluginsRouteOptions): HttpRoute => ({
  method: 'GET',
  async handle(call) {
    const secret = installSecret(call)
    if (!secret || !installs.check(secret)) return expired()
    const plugins = await sharedPlugins(home)
    if (plugins.length === 0) return new Response(null, { status: 204, headers: { 'x-sand-plugins': '0' } })
    const archive = new Bun.Archive(await pluginEntries(join(home, 'plugins'), plugins), { compress: 'gzip' })
    const bytes = await archive.bytes()
    installs.step(secret, 'plugins', { plugins: plugins.length })
    return new Response(bytes, {
      headers: {
        'content-type': 'application/gzip',
        'cache-control': 'no-store',
        'x-sand-plugins': String(plugins.length),
      },
    })
  },
})
