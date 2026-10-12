import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { ShellJobs } from './background'
import type { Shell } from './detect'
import { masked } from './mask'
import { run } from './run'

const input = z.object({
  command: z.string().describe('Command to run'),
  timeout_ms: z.number().int().positive().optional().describe('Kill the command after this many milliseconds'),
  background: z
    .boolean()
    .optional()
    .describe('Start it as a background job and return its id at once, for servers and long tasks. Its exit code and output tail arrive as a <task-notification>; read, message and stop it with the jobs tools. In a subagent, background commands stop when it finishes.'),
})

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max / 2)}\n… ${text.length - max} characters omitted …\n${text.slice(-max / 2)}`

export const shellTool = (
  shell: Shell,
  timeout: number,
  maxOutput: number,
  env: (session: string) => Record<string, string>,
  jobs: ShellJobs,
): Tool<typeof input> => ({
  name: 'shell',
  description: 'Run a shell command from the working directory. Returns combined output and the exit code. Each call is a fresh process.',
  environment: `Shell: ${shell.name}`,
  input,
  async run({ command, timeout_ms = timeout, background }, context) {
    const options = { cwd: context.cwd, verbatim: shell.verbatim, env: env(context.session.id) }
    if (background) {
      const job = jobs.start(command, shell.argv(command), context, options)
      return `Started background job ${job.id}. Its exit code and output tail arrive as a <task-notification> when it ends.`
    }
    const { code, timedOut, stdout, stderr } = await run(shell.argv(command), { ...options, signal: context.signal, timeout: timeout_ms })
    const output = truncate(masked([stdout, stderr].filter(Boolean).join('\n').trimEnd(), Object.values(options.env)), maxOutput)
    return `${output || '(no output)'}\n[exit code ${code}${timedOut ? ', timed out' : ''}]`
  },
})
