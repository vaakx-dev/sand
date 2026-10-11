import type { HostApp } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { appMain, appRoot } from '@sand/kit/host'
import { join } from 'node:path'
import { failedPlugins, waitingPlugins } from '../app/diagnose'
import { builtinLoader, builtins, loadPlugins } from '../app/loader'
import { startApp } from '../app/start'
import { restartHost } from '../daemon/restart'
import { readHostConfig } from './config'
import { loadIdentity } from './identity'

const hostApp = (main: string): HostApp => {
  let root = appRoot(main)
  return {
    root: () => root,
    main: () => appMain(root),
    use: next => {
      root = next
    },
  }
}

export const runHost = async ({ home }: { home: string }) => {
  const { ctx, exit } = startApp()
  ctx.on('drydock.error', (scope, error) => console.error(`[${scope.name}] ${errorMessage(error)}`))
  const { port, name, watch, drainTimeout } = await readHostConfig(home)
  const device = await loadIdentity(home, name)
  const main = join(import.meta.dir, '..', 'main.ts')

  ctx.provide('hostOptions', { home, main, port, watch, drainTimeout, device })
  ctx.provide('hostApp', hostApp(main))
  ctx.provide('cli', { mode: 'host', cwd: process.cwd(), home, builtins, args: [], flags: {}, safe: false, exit })

  process.on('SIGINT', () => exit(0))
  process.on('SIGTERM', () => exit(0))
  ctx.on('host.stop', () => exit(0))
  ctx.on('host.restart', () => void restartHost(home, () => ctx.dispose()).finally(() => process.exit(0)))

  loadPlugins(ctx, builtinLoader())

  await ctx.settled()
  const problems = [...waitingPlugins(ctx), ...failedPlugins(ctx)]
  if (!problems.length) return
  console.error(problems.join('\n'))
  exit(1)
}
