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
  label: z.string().optional().describe('A few words for the UI (default: the command)'),
})

export const backgroundTool = (ctx: Context, jobs: BackgroundJobs, runner: ShellRunner, sessions: Sessions): Tool<typeof input> => ({
  name: 'run_background',
  description:
    "Start a shell command that is meant to run long, like a dev server, watcher or long build, as a background job in the working directory. Returns at once with its job id. Read its output with job_read, wait for it with job_wait and stop it with job_stop. When it exits, a <task-notification> brings its exit code and last output. It runs in the same shell as the shell tool; restarting sand stops it.",
  input,
  needs: ['thread', 'pc'],
  act: ({ command }) => ({ effect: 'run', summary: command }),
  run({ command, label }, { conversation, cwd, call }) {
    const output = outputTail()
    const job = jobs.start({
      kind: 'command',
      parent: sessions.require(conversation.id),
      label: label ?? oneLine(command, 80),
      origin: call.id,
      work: commandWork(ctx, runner, command, cwd, output),
      read: output.read,
    })
    return `Started ${job.id}. Its exit arrives as a <task-notification>. Read its output with job_read and stop it with job_stop when you no longer need it.`
  },
})
