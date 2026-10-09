import type { CliCommands, CliFlags, CliMode, CliValues } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { createApp, inspector, share, type Context } from 'drydock'
import { join } from 'node:path'
import { daemonService } from '../daemon/service'
import { runtimeLink } from '../runtime/link'
import { commandRegistry } from './commands/registry'
import { runCommand } from './commands/run'
import { problems } from './diagnose'
import { builtins, loaderFolder } from './loader'

export interface RunOptions {
  mode: CliMode
  home: string
  args: string[]
  flags: CliFlags
  values?: CliValues
  prompt?: string
  safe: boolean
}

const shared = ['drydock', '@sand/protocol', '@sand/kit', '@sand/kit/fs', '@sand/kit/host', 'zod']

const finish = async (ctx: Context, { args, values = {} }: RunOptions, commands: CliCommands | undefined, exit: (code?: number) => void) => {
  if (commands) return exit(await runCommand(commands, args, values))
  const found = problems(ctx)
  if (!found.length) return
  console.error(found.join('\n'))
  exit(1)
}

export const run = async (options: RunOptions) => {
  const { mode, home, args, flags, prompt, safe } = options
  share(Object.fromEntries(shared.map(name => [name, Bun.resolveSync(name, import.meta.dir)])))

  const ctx = createApp()
  const exit = (code = 0) => void ctx.dispose().finally(() => process.exit(code))

  ctx.on('drydock.error', (scope, error) => {
    const text = `[${scope.name}] ${errorMessage(error)}`
    if (ctx.ui) ctx.ui.notify(text, 'error')
    else console.error(text)
  })
  if (mode === 'serve') process.on('SIGINT', () => exit(0))
  ctx.plugin(inspector)
  ctx.provide('cli', { mode, cwd: process.cwd(), home, builtins, args, flags, prompt, safe, exit })
  if (mode === 'serve') ctx.plugin(runtimeLink)
  const commands = mode === 'command' ? commandRegistry() : undefined
  if (commands) {
    ctx.provide('cliCommands', commands)
    ctx.provide('daemon', daemonService(home))
  }
  ctx.load(await loaderFolder(home, safe), {
    modes_file: join(import.meta.dir, 'modes.ts'),
    resolve_from: import.meta.dir,
  })

  await ctx.settled()
  await finish(ctx, options, commands, exit)
}
