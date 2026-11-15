import type { Sessions } from '@sand/chats/contract'
import type { BackgroundJobs } from '@sand/jobs/contract'
import { outputTail, type ShellRunner } from '@sand/shell/contract'
import type { Context } from 'drydock'
import { commandWork } from './work'

interface Adopting {
  jobs: BackgroundJobs
  runner: ShellRunner
  sessions: Sessions
}

export const adoptCommands = (ctx: Context, { jobs, runner, sessions }: Adopting) =>
  runner.follow(command => {
    const parent = sessions.open(command.conversation)
    if (!parent) return
    const output = outputTail(command.output)
    jobs.start({
      id: command.id,
      started: command.started,
      parent,
      label: command.label,
      command: command.command,
      cwd: command.cwd,
      ...(command.origin && { origin: command.origin }),
      work: commandWork(ctx, output, (_, onText) => runner.attach(command, onText)),
      read: output.read,
      output: output.last,
    })
  })
