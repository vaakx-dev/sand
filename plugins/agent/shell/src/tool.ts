import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Shell } from './detect'
import { run } from './run'

const input = z.object({
  command: z.string().describe('Command to run'),
  timeout_ms: z.number().int().positive().optional().describe('Kill the command after this many milliseconds'),
})

export interface Limits {
  timeout_ms: number
  max_output: number
}

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max / 2)}\n… ${text.length - max} characters omitted; filter with grep, head or tail …\n${text.slice(-max / 2)}`

export const shellTool = (
  spec: Pick<Tool, 'name' | 'description' | 'environment'>,
  shell: Shell,
  { timeout_ms: timeout, max_output: maxOutput }: Limits,
): Tool<typeof input> => ({
  ...spec,
  input,
  async run({ command, timeout_ms = timeout }, context) {
    const options = { cwd: context.cwd, verbatim: shell.verbatim }
    const { code, timedOut, stdout, stderr } = await run(shell.argv(command), { ...options, signal: context.signal, timeout: timeout_ms })
    const output = truncate([stdout, stderr].filter(Boolean).join('\n').trimEnd(), maxOutput)
    return `${output || '(no output)'}\n[exit code ${code}${timedOut ? ', timed out' : ''}]`
  },
})
