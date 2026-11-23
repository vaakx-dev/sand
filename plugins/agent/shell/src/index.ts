import { hostChannel } from '@sand/host-runtimes/contract'
import { logins } from '@sand/logins/contract'
import { processes, type TrackedJob } from '@sand/processes/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers, oneLine } from '@sand/util'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createCommands, hostKeeping, localKeeping } from './commands'
import { shellRunner } from './contract'
import { detect, sidePowerShell } from './detect'
import { shellRunnerOf } from './runner'
import { shellTool } from './tool'

const LABEL_CHARS = 80

const FILE_TOOLS_FIRST =
  'To find files use glob, to search file contents use grep, to read a file or list a folder use read, and to change files use edit or write: they are faster, skip gitignored files and keep output short.'

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
    const trackFor = (conversation: string, command: string) => (pid: number, job?: TrackedJob) =>
      ctx.get(processes)?.track({ conversation, pid, label: oneLine(command, LABEL_CHARS), kind: 'command', job })
    ctx.watch(hostChannel, channel => {
      const commands = createCommands({
        keeping: channel ? hostKeeping(channel) : localKeeping,
        track: ({ conversation, command }, pid) => trackFor(conversation, command)(pid),
        report: error => ctx.report(error),
      })
      return joinDisposers(ctx.provide(shellRunner, shellRunnerOf(shell, commands)), commands.close)
    })
    const powerShell = sidePowerShell(shell)
    const shells = [
      {
        spec: {
          name: 'shell',
          description: `Run a shell command in the working directory, each call in a fresh process. ${FILE_TOOLS_FIRST}`,
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
                  `Run PowerShell commands in the working directory, each call in a fresh process. Use it instead of calling powershell through shell. ${FILE_TOOLS_FIRST}`,
              },
              shell: powerShell,
            },
          ]
        : []),
    ]
    ctx.watch(logins, found => joinDisposers(...shells.map(entry => ctx.tools.register(shellTool(ctx, { ...entry, limits: config, logins: found, trackFor })))))
  },
})
