import { errorMessage } from '@sand/kit'
import { createApp } from 'drydock'
import { join } from 'node:path'
import { readHostConfig } from './config'
import { hostDevicesPlugin } from './devices'
import { distPlugin } from './dist'
import { gatewayPlugin } from './gateway'
import { healthPlugin } from './health'
import { hubPlugin } from './hub'
import { loadIdentity } from './identity'
import { pluginLibraryPlugin } from './plugin-library'
import { pluginSyncPlugin } from './plugin-sync'
import { hostProjectsPlugin } from './projects'
import { projectSyncPlugin } from './projects/sync'
import { remotesPlugin } from './remotes'
import { runtimesPlugin } from './runtimes'
import { tailscalePlugin } from './tailscale'
import { createHostApp } from './updates/app'
import { restartHost } from './updates/restart'
import { updatesPlugin } from './updates'
import { watchPlugin } from './watch'

export const runHost = async ({ home }: { home: string }) => {
  const ctx = createApp()
  ctx.on('drydock.error', (scope, error) => console.error(`[${scope.name}] ${errorMessage(error)}`))
  const { port, name, watch, drainTimeout } = await readHostConfig(home)
  const device = await loadIdentity(home, name)
  const main = join(import.meta.dir, '..', 'main.ts')
  ctx.provide('hostOptions', { home, main, port, watch, drainTimeout, device })
  ctx.provide('hostApp', createHostApp(main))
  ctx.plugin(runtimesPlugin)
  ctx.plugin(hubPlugin)
  ctx.plugin(hostDevicesPlugin)
  ctx.plugin(tailscalePlugin)
  ctx.plugin(gatewayPlugin)
  ctx.plugin(distPlugin)
  ctx.plugin(remotesPlugin)
  ctx.plugin(updatesPlugin)
  ctx.plugin(healthPlugin)
  ctx.plugin(hostProjectsPlugin)
  ctx.plugin(projectSyncPlugin)
  ctx.plugin(pluginSyncPlugin)
  ctx.plugin(pluginLibraryPlugin)
  ctx.plugin(watchPlugin)

  const stop = () => void ctx.dispose().finally(() => process.exit(0))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  ctx.on('host.stop', stop)
  ctx.on('host.restart', () => void restartHost(home, () => ctx.dispose()).finally(() => process.exit(0)))

  await ctx.settled()
  const plugins = ctx.scopes().filter(scope => scope.kind === 'plugin')
  const stuck = [
    ...plugins.filter(scope => scope.status === 'pending').map(scope => `${scope.name} is waiting for: ${scope.missing().join(', ')}`),
    ...plugins.filter(scope => scope.status === 'failed').map(scope => `${scope.name} failed: ${errorMessage(scope.error)}`),
  ]
  if (!stuck.length) return
  console.error(stuck.join('\n'))
  await ctx.dispose().finally(() => process.exit(1))
}
