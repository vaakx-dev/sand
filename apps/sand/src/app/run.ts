import type { CliFlags, CliMode } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { createApp, inspector, share } from 'drydock'
import { join } from 'node:path'
import { runtimeLink } from '../runtime/link'
import { problems } from './diagnose'
import { builtins, loaderFolder } from './loader'

export interface RunOptions {
  mode: CliMode
  home: string
  args: string[]
  flags: CliFlags
  prompt?: string
}

const shared = ['drydock', '@sand/protocol', '@sand/kit', '@sand/host', 'zod']

export const run = async ({ mode, home, args, flags, prompt }: RunOptions) => {
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
  ctx.provide('cli', { mode, cwd: process.cwd(), home, builtins, args, flags, prompt, exit })
  if (mode === 'serve') ctx.plugin(runtimeLink)
  ctx.load(await loaderFolder(home), {
    modes_file: join(import.meta.dir, 'modes.ts'),
    resolve_from: import.meta.dir,
  })

  await ctx.settled()
  const found = problems(ctx)
  if (!found.length) return
  console.error(found.join('\n'))
  exit(1)
}
