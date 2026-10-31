import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { shellRunner } from './contract'
import { detect, sidePowerShell } from './detect'
import { shellRunnerOf } from './runner'
import { shellTool } from './tool'

export default definePlugin({
  name: 'shell',
  inject: { tools },
  config: z.object({
    shell: z.string().optional(),
    timeout_ms: z.number().int().positive().default(120_000),
    max_output: z.number().int().positive().default(10_000),
  }),
  apply(ctx, config) {
    const shell = detect(config.shell)
    ctx.provide(shellRunner, shellRunnerOf(shell))
    ctx.effect(() =>
      ctx.tools.register(
        shellTool(
          {
            name: 'shell',
            description: 'Run a shell command from the working directory. Returns combined output and the exit code. Each call is a fresh process.',
            environment: `Shell: ${shell.name}`,
          },
          shell,
          config,
        ),
      ),
    )
    const powerShell = sidePowerShell(shell)
    if (!powerShell) return
    ctx.effect(() =>
      ctx.tools.register(
        shellTool(
          {
            name: 'powershell',
            description:
              'Run PowerShell commands from the working directory. Use this for PowerShell instead of calling powershell through shell. Returns combined output and the exit code. Each call is a fresh process.',
          },
          powerShell,
          config,
        ),
      ),
    )
  },
})
