import type { CliFlags, CliMode, CliValues } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { inspector } from 'drydock'
import { daemonService } from '../daemon/service'
import { runtimeLink } from '../runtime/link'
import { commandRegistry } from './commands/registry'
import { runCommand } from './commands/run'
import { problems } from './diagnose'
import { builtins, loaderFolder, loadPlugins } from './loader'
import { startApp } from './start'

interface RunOptions {
  mode: CliMode
  home: string
  args: string[]
  flags: CliFlags
  values?: CliValues
  prompt?: string
  safe: boolean
}

export const run = async ({ mode, home, args, flags, values = {}, prompt, safe }: RunOptions) => {
  const { ctx, exit } = startApp()

  ctx.on('drydock.error', (scope, error) => {
    const text = `[${scope.name}] ${errorMessage(error)}`
    if (ctx.ui) ctx.ui.notify(text, 'error')
    else console.error(text)
  })
  if (mode === 'serve') {
    process.on('SIGINT', () => exit(0))
    process.on('SIGTERM', () => exit(0))
  }
  ctx.plugin(inspector)
  ctx.provide('cli', { mode, cwd: process.cwd(), home, builtins, args, flags, prompt, safe, exit })
  if (mode === 'serve') ctx.plugin(runtimeLink)
  const commands = mode === 'command' ? commandRegistry() : undefined
  if (commands) {
    ctx.provide('cliCommands', commands)
    ctx.provide('daemon', daemonService(home))
  }
  loadPlugins(ctx, await loaderFolder(home, safe))

  await ctx.settled()
  if (commands) return exit(await runCommand(commands, args, values))
  const found = problems(ctx)
  if (!found.length) return
  console.error(found.join('\n'))
  exit(1)
}
