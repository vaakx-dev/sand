import type { BackgroundJobs } from '@sand/jobs/contract'
import type { ShellRunner } from '@sand/shell/contract'
import type { Sessions } from '@sand/chats/contract'
import type { Tool } from '@sand/tools/contract'
import { oneLine } from '@sand/util'
import type { Context } from 'drydock'
import { z } from 'zod'
import { outputTail } from './output'
import { commandWork } from './work'

const input = z.object({
  command: z.string().describe('Command to run'),
  label: z.string().optional().describe('A short title for the job (default: the command)'),
})

export const backgroundTool = (ctx: Context, jobs: BackgroundJobs, runner: ShellRunner, sessions: Sessions): Tool<typeof input> => ({
  name: 'run_background',
  description:
    "Start a long-running shell command, like a dev server, watcher or long build, in the background, in the working directory and the same shell as the shell tool. Returns its job id at once. Read its output with job_read, wait for it with job_wait and stop it with job_stop. To wait until it is up, call job_wait with until set to a pattern from its output, like 'listening on|ready'; it returns the moment that line appears, so never sleep or poll in a loop. When it exits, a <task-notification> brings its exit code and last output.",
  input,
  needs: ['thread', 'pc'],
  effect: 'run',
  run({ command, label }, { conversation, cwd, call }) {
    const output = outputTail()
    const job = jobs.start({
      kind: 'command',
      parent: sessions.require(conversation.id),
      label: label ?? oneLine(command, 80),
      origin: call.id,
      work: commandWork(ctx, runner, command, cwd, output),
      read: output.read,
      output: output.last,
    })
    return `Started ${job.id}. Its exit arrives as a <task-notification>. Wait until it's up with job_wait and until, read its output with job_read, and stop it with job_stop when you no longer need it.`
  },
})
