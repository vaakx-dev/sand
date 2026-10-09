import type { Tool } from '@sand/protocol'
import { z } from 'zod'
import type { Shell } from './detect'
import { run } from './run'

const input = z.object({
  command: z.string().describe('Command to run'),
  timeout_ms: z.number().int().positive().optional().describe('Kill the command after this many milliseconds'),
})

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max / 2)}\n… ${text.length - max} characters omitted …\n${text.slice(-max / 2)}`

export const shellTool = (shell: Shell, timeout: number, maxOutput: number): Tool<typeof input> => ({
  name: 'shell',
  description: 'Run a shell command from the working directory. Returns combined output and the exit code. Each call is a fresh process.',
  environment: `Shell: ${shell.name}`,
  input,
  async run({ command, timeout_ms = timeout }, { cwd, signal }) {
    const { code, timedOut, stdout, stderr } = await run(shell.argv(command), { cwd, signal, timeout: timeout_ms, verbatim: shell.verbatim })
    const output = truncate([stdout, stderr].filter(Boolean).join('\n').trimEnd(), maxOutput)
    return `${output || '(no output)'}\n[exit code ${code}${timedOut ? ', timed out' : ''}]`
  },
})
