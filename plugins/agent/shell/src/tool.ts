import type { Logins } from '@sand/logins/contract'
import type { Tool } from '@sand/tools/contract'
import { duration, head, oneLine, tail } from '@sand/util'
import type { Context } from 'drydock'
import { z } from 'zod'
import { shellReady } from './contract'
import type { Shell } from './detect'
import { liveTail } from './live'
import { loginEnv, loginsAct, loginsField } from './logins'
import type { Track } from '@sand/process-tree'
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

const AGENT_ENV = { CI: '1' }

const stopGrace = 30_000

const TIMED_AFTER_MS = 1000

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
      .describe(`Stop after this long without output (default ${silence_ms}); raise it for quiet commands`),
  })
  return saved ? input.extend({ logins: loginsField }) : input
}

const rules = ({ silence_ms, limit_ms }: Limits) =>
  `Stopped after ${minutes(silence_ms)} without output or ${minutes(limit_ms)} in all. No input and CI=1, so prompts fail.`

const SAMPLE_CHARS = 200

interface Stopped {
  timeouts: Timeouts
  repeated: string | undefined
}

const stopReasons: Record<Stop, (stopped: Stopped) => string> = {
  silence: ({ timeouts }) => `no output for ${minutes(timeouts.silence)}`,
  repeats: ({ timeouts, repeated = '' }) => `only repeated output for ${minutes(timeouts.silence)}, like: ${oneLine(repeated, SAMPLE_CHARS)}`,
  limit: ({ timeouts }) => `still running after ${minutes(timeouts.limit)}`,
}

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${head(text, max / 2)}\n… ${text.length - max} characters omitted; filter with grep, head or tail …\n${tail(text, max / 2)}`

const unchanged = (text: string) => text

const tookText = (ms: number) => (ms >= TIMED_AFTER_MS ? `, took ${duration(ms)}` : '')

interface ShellToolOptions {
  spec: Pick<Tool, 'name' | 'description' | 'environment'>
  shell: Shell
  limits: Limits
  logins: Logins | undefined
  trackFor(conversation: string, command: string): Track
}

export const shellTool = (ctx: Context, { spec, shell, limits, logins, trackFor }: ShellToolOptions): Tool<z.ZodType<ShellInput>> => {
  const redact = logins ? (text: string) => logins.redact(text) : unchanged
  return {
    ...spec,
    description: `${spec.description} ${rules(limits)}`,
    input: inputOf(limits, logins !== undefined),
    needs: ['pc'],
    act: ({ command, logins: wanted }) => (logins && wanted ? loginsAct(wanted, command) : { effect: 'run', summary: command }),
    timeoutMs: limits.limit_ms + stopGrace,
    async run({ command, silence_ms: silence = limits.silence_ms, logins: wanted }, context) {
      await ctx.waterfall(shellReady, context.cwd, context.signal, context.progress)
      context.signal.throwIfAborted()
      const env = logins && wanted ? { ...AGENT_ENV, ...(await loginEnv(logins, wanted, context.conversation)) } : AGENT_ENV
      const timeouts = { silence, limit: limits.limit_ms }
      const tail = liveTail(context.progress, redact)
      const started = performance.now()
      const { code, stopped, repeated, stdout, stderr } = await run(shell.argv(command), {
        ...timeouts,
        cwd: context.cwd,
        verbatim: shell.verbatim,
        env,
        track: trackFor(context.conversation.id, command),
        signal: context.signal,
        onText: tail.add,
      })
      tail.stop()
      const took = tookText(performance.now() - started)
      const output = truncate(redact([stdout, stderr].filter(Boolean).join('\n').trimEnd()), limits.max_output)
      const reason = stopped ? `, stopped: ${stopReasons[stopped]({ timeouts, repeated: repeated && redact(repeated) })}` : ''
      return `${output || '(no output)'}\n[exit code ${code}${took}${reason}]`
    },
  }
}
