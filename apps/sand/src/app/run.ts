import { cli, type CliPlace } from '@sand/config/contract'
import { errorMessage } from '@sand/util'
import { inspectorPlugin, scopeError } from 'drydock'
import { join } from 'node:path'
import { problems } from './diagnose'
import { builtins, loaderFolder, runsUserPlugins } from './loader'
import { sharedModules } from './modules'
import { startApp } from './start'
import { writeTypings } from './typings'

interface RunOptions {
  place: CliPlace
  home: string
  safe: boolean
  args: string[]
  prompt?: string
}

export const run = async (options: RunOptions) => {
  const modules = await sharedModules()
  const { ctx, exit } = startApp(modules)
  if (runsUserPlugins(options))
    await writeTypings(join(options.home, 'plugins'), modules).catch(error => console.error(`could not write plugin typings: ${errorMessage(error)}`))
  ctx.on(scopeError, (scope, error) => console.error(`[${scope.name}] ${errorMessage(error)}`))
  ctx.plugin(inspectorPlugin)
  ctx.provide(cli, { ...options, cwd: process.cwd(), builtins, exit })
  ctx.load(await loaderFolder(options))

  await ctx.settled()
  const found = problems(ctx)
  if (!found.length) return
  console.error(found.join('\n'))
  if (options.place === 'host') exit(1)
}
