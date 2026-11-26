import type { Sessions } from '@sand/chats/contract'
import type { BackgroundJobs, Job } from '@sand/jobs/contract'
import { type CommandSpec, outputTail } from '@sand/command-keeper/contract'
import type { ShellRunner } from '@sand/shell/contract'
import type { Tool } from '@sand/tools/contract'
import { oneLine } from '@sand/util'
import type { Context } from 'drydock'
import { z } from 'zod'
import { commandWork, whenReady } from './work'

const input = z.object({
  command: z.string().describe('Command to run'),
  label: z.string().optional().describe('A short title for the job (default: the command)'),
})

const commandOf = ({ id, command, cwd, parent, label, origin }: Job): CommandSpec => ({ id, command, cwd, conversation: parent, label, ...(origin && { origin }) })

export const backgroundTool = (ctx: Context, jobs: BackgroundJobs, runner: ShellRunner, sessions: Sessions): Tool<typeof input> => ({
  name: 'run_background',
  description:
    "Start a long-running command, like a dev server, watcher or long build, in the background in the shell tool's shell. Returns a job id at once; its exit arrives as a <task-notification>.",
  input,
  needs: ['thread', 'pc'],
  act: ({ command }) => ({ effect: 'run', summary: command }),
  hint: () => ({ tools: ['job_wait', 'job_read', 'job_stop'], purpose: 'to wait for, read or stop it' }),
  run({ command, label }, { conversation, cwd, call }) {
    const output = outputTail()
    const job = jobs.start({
      parent: sessions.require(conversation.id),
      label: label ?? oneLine(command, 80),
      command,
      cwd,
      origin: call.id,
      work: whenReady(
        ctx,
        commandWork(ctx, output, (started, onText) => runner.start(commandOf(started), onText)),
      ),
      outlives: runner.outlives,
      read: output.read,
      output: output.last,
    })
    return `Started ${job.id}. Its exit arrives as a <task-notification>. Wait until it's up with job_wait and until, read its output with job_read, and stop it with job_stop when you no longer need it.`
  },
})
