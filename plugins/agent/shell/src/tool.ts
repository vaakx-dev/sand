import type { Logins } from '@sand/logins/contract'
import type { Tool } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { z } from 'zod'
import { shellReady } from './contract'
import type { Shell } from './detect'
import { liveTail } from './live'
import { loginEnv, loginsAct, loginsField } from './logins'
import { agentEnv } from './process'
import { run, type Stop, type Timeouts } from './run'

export interface Limits {
  silence_ms: number
  limit_ms: number
  max_output: number
}

interface ShellInput {
  command: string
  silence_ms?: number | undefined
  logins?: Record<string, string> | undefined
}

const stopGrace = 30_000

const minutes = (ms: number) => {
  const count = Math.round(ms / 6_000) / 10
  return `${count} minute${count === 1 ? '' : 's'}`
}

const inputOf = ({ silence_ms, limit_ms }: Limits, saved: boolean): z.ZodType<ShellInput> => {
  const input = z.object({
    command: z.string().describe('Command to run'),
    silence_ms: z
      .number()
      .int()
      .positive()
      .max(limit_ms)
      .optional()
      .describe(`Stop the command after this many milliseconds without new output (default ${silence_ms}). Raise it for commands you know are quiet.`),
  })
  return saved ? input.extend({ logins: loginsField }) : input
}

const rules = ({ silence_ms, limit_ms }: Limits) =>
  `A command is stopped after ${minutes(silence_ms)} without new output and after ${minutes(limit_ms)} in any case. Commands get no input and run with CI=1, so prompts fail instead of waiting.`

const stopReasons: Record<Stop, (timeouts: Timeouts) => string> = {
  silence: ({ silence }) => `no output for ${minutes(silence)}`,
  limit: ({ limit }) => `still running after ${minutes(limit)}`,
}

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max / 2)}\n… ${text.length - max} characters omitted; filter with grep, head or tail …\n${text.slice(-max / 2)}`

const unchanged = (text: string) => text

export const shellTool = (
  ctx: Context,
  spec: Pick<Tool, 'name' | 'description' | 'environment'>,
  shell: Shell,
  limits: Limits,
  logins: Logins | undefined,
): Tool<z.ZodType<ShellInput>> => {
  const redact = logins ? (text: string) => logins.redact(text) : unchanged
  return {
    ...spec,
    description: `${spec.description} ${rules(limits)}`,
    input: inputOf(limits, logins !== undefined),
    needs: ['pc'],
    act: ({ command, logins: wanted }, conversation) =>
      logins && wanted ? loginsAct(logins, wanted, conversation, command) : { effect: 'run', summary: command },
    timeoutMs: limits.limit_ms + stopGrace,
    async run({ command, silence_ms: silence = limits.silence_ms, logins: wanted }, context) {
      await ctx.waterfall(shellReady, context.cwd, context.signal, context.progress)
      context.signal.throwIfAborted()
      const env = logins && wanted ? { ...agentEnv, ...(await loginEnv(logins, wanted, context.conversation)) } : agentEnv
      const timeouts = { silence, limit: limits.limit_ms }
      const tail = liveTail(context.progress, redact)
      const { code, stopped, stdout, stderr } = await run(shell.argv(command), {
        ...timeouts,
        cwd: context.cwd,
        verbatim: shell.verbatim,
        env,
        signal: context.signal,
        onText: tail.add,
      })
      tail.stop()
      const output = truncate(redact([stdout, stderr].filter(Boolean).join('\n').trimEnd()), limits.max_output)
      const reason = stopped ? `, stopped: ${stopReasons[stopped](timeouts)}` : ''
      return `${output || '(no output)'}\n[exit code ${code}${reason}]`
    },
  }
}
