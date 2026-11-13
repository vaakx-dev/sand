import { logins } from '@sand/logins/contract'
import { processes } from '@sand/processes/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers, oneLine } from '@sand/util'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { shellRunner } from './contract'
import { detect, sidePowerShell } from './detect'
import { shellRunnerOf } from './runner'
import { shellTool } from './tool'

const LABEL_CHARS = 80

export default definePlugin({
  name: 'shell',
  inject: { tools },
  config: z.object({
    shell: z.string().optional(),
    silence_ms: z.number().int().positive().default(120_000),
    limit_ms: z.number().int().positive().default(1_200_000),
    max_output: z.number().int().positive().default(10_000),
  }),
  apply(ctx, config) {
    const shell = detect(config.shell)
    const trackFor = (conversation: string, command: string) => (pid: number) =>
      ctx.get(processes)?.track({ conversation, pid, label: oneLine(command, LABEL_CHARS), kind: 'command' })
    ctx.provide(shellRunner, shellRunnerOf(shell, trackFor))
    const powerShell = sidePowerShell(shell)
    const shells = [
      {
        spec: {
          name: 'shell',
          description: 'Run a shell command from the working directory. Returns combined output and the exit code. Each call is a fresh process.',
          environment: `Shell: ${shell.name}`,
        },
        shell,
      },
      ...(powerShell
        ? [
            {
              spec: {
                name: 'powershell',
                description:
                  'Run PowerShell commands from the working directory. Use this for PowerShell instead of calling powershell through shell. Returns combined output and the exit code. Each call is a fresh process.',
              },
              shell: powerShell,
            },
          ]
        : []),
    ]
    ctx.watch(logins, found => joinDisposers(...shells.map(entry => ctx.tools.register(shellTool(ctx, { ...entry, limits: config, logins: found, trackFor })))))
  },
})
