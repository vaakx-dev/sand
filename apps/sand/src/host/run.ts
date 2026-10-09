import type { HostApp } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { appMain, appRoot } from '@sand/kit/host'
import { createApp, share, type Context } from 'drydock'
import { dirname, join } from 'node:path'
import { builtins } from '../app/loader'
import { restartHost } from '../daemon/restart'
import { readHostConfig } from './config'
import { loadIdentity } from './identity'

const shared = ['drydock', '@sand/protocol', '@sand/kit', '@sand/kit/fs', '@sand/kit/host', 'zod']

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

const stuck = (ctx: Context) => {
  const plugins = ctx.scopes().filter(scope => scope.kind === 'plugin')
  return [
    ...plugins.filter(scope => scope.status === 'pending').map(scope => `${scope.name} is waiting for: ${scope.missing().join(', ')}`),
    ...plugins.filter(scope => scope.status === 'failed').map(scope => `${scope.name} failed: ${errorMessage(scope.error)}`),
  ]
}

export const runHost = async ({ home }: { home: string }) => {
  share(Object.fromEntries(shared.map(name => [name, Bun.resolveSync(name, import.meta.dir)])))
  const ctx = createApp()
  ctx.on('drydock.error', (scope, error) => console.error(`[${scope.name}] ${errorMessage(error)}`))
  const { port, name, watch, drainTimeout } = await readHostConfig(home)
  const device = await loadIdentity(home, name)
  const main = join(import.meta.dir, '..', 'main.ts')
  const exit = (code = 0) => void ctx.dispose().finally(() => process.exit(code))

  ctx.provide('hostOptions', { home, main, port, watch, drainTimeout, device })
  ctx.provide('hostApp', hostApp(main))
  ctx.provide('cli', { mode: 'host', cwd: process.cwd(), home, builtins, args: [], flags: {}, safe: false, exit })

  process.on('SIGINT', () => exit(0))
  process.on('SIGTERM', () => exit(0))
  ctx.on('host.stop', () => exit(0))
  ctx.on('host.restart', () => void restartHost(home, () => ctx.dispose()).finally(() => process.exit(0)))

  ctx.load(dirname(Bun.resolveSync('@sand/config-toml/package.json', import.meta.dir)), {
    modes_file: join(import.meta.dir, '..', 'app', 'modes.ts'),
    resolve_from: join(import.meta.dir, '..', 'app'),
  })

  await ctx.settled()
  const problems = stuck(ctx)
  if (!problems.length) return
  console.error(problems.join('\n'))
  exit(1)
}
