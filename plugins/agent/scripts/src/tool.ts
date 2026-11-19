import type { ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import { concealBlock, type Tool, type ToolContext, type Tools } from '@sand/tools/contract'
import { head, inputText, plural, tail } from '@sand/util'
import { z } from 'zod'
import { scriptEntry, type ScriptRun, type ScriptStatus } from './contract'
import { lanes } from './lanes'
import type { Runs } from './runs'
import { type Outcome, type Reply, runSandboxed } from './sandbox/run'

type Run = ReturnType<Runs['start']>

const NAME = 'script'
const DEFAULT_SECONDS = 120
const MOST_SECONDS = 600
const STOP_GRACE_MS = 10_000
const MAX_OUTPUT = 30_000
const PROGRESS_CHARS = 120

const DESCRIPTION = "Run JavaScript that calls your other tools, like `await tools.read({ path })`, which returns the tool's text and throws on failure. Only what it prints or returns reaches you. Use it over several calls when you need only part of their output. Not Node: no require, fs or fetch."

const ENVIRONMENT = `Put quick lookups together in one ${NAME} call that prints only what matters.`

const input = z.object({
  title: z.string().describe('Shown to the user'),
  code: z.string(),
  timeout_seconds: z
    .number()
    .int()
    .positive()
    .max(MOST_SECONDS)
    .optional()
    .describe(`Default ${DEFAULT_SECONDS}`),
})

type Input = z.output<typeof input>

const cut = (text: string) =>
  text.length <= MAX_OUTPUT ? text : `${head(text, MAX_OUTPUT / 2)}\n… ${text.length - MAX_OUTPUT} characters omitted …\n${tail(text, MAX_OUTPUT / 2)}`

const resultText = (result: ToolResultBlock) => result.content.map(block => (block.type === 'text' ? block.text : `[${block.type}]`)).join('\n')

const printedText = ({ printed, value }: Outcome) => cut([...printed, ...(value === undefined ? [] : [value])].join('\n'))

const callsNote = ({ calls }: ScriptRun) =>
  calls.length ? `It made ${plural(calls.length, 'tool call')} first.` : ''

const withPrinted = (lead: string, outcome: Outcome, note = '') => {
  const printed = printedText(outcome)
  return [lead, note, printed && `It printed:\n${printed}`].filter(Boolean).join('\n\n')
}

const statusOf = (outcome: Outcome, signal: AbortSignal): ScriptStatus => {
  if (signal.aborted) return 'stopped'
  return outcome.error === undefined ? 'done' : 'failed'
}

const limitLead = (seconds: number) => `Stopped at the ${plural(seconds, 'second')} limit.`

const plain = (name: string) => name.replace(/^mcp__[^_]+__|^mcp_/, '').toLowerCase()

const callable = (tools: Tools, { conversation }: ToolContext) =>
  tools
    .specs([], conversation)
    .map(spec => spec.name)
    .filter(name => name !== NAME)

const scriptTool = (tools: Tools, runs: Runs): Tool<typeof input> => {
  const toolCall = (run: Run, context: ToolContext, signal: AbortSignal, names: string[]) => {
    const lane = lanes()
    let count = 0

    const execute = async (call: ToolCallBlock): Promise<Reply> => {
      const shown = concealBlock(call, tools.secrets())
      run.record({ call: shown })
      context.progress(`${call.name} ${inputText(shown.input, PROGRESS_CHARS)}`)
      const work = () => tools.run(call, { cwd: context.cwd, signal, conversation: context.conversation, turn: context.turn, progress: () => {}, wait: context.wait })
      const result = await (tools.parallel(call, context.conversation) ? lane.together(work) : lane.alone(work))
      run.record({ call: shown, result })
      return { text: resultText(result) || '(no output)', failed: result.isError === true }
    }

    return (asked: string, given: unknown): Promise<Reply> => {
      const name = names.find(known => known === asked) ?? names.find(known => plain(known) === plain(asked))
      if (!name) return Promise.resolve({ text: `No tool ${asked}. Tools: ${names.join(', ')}`, failed: true })
      if (signal.aborted) return Promise.resolve({ text: 'Not run: stopped.', failed: true })
      return execute({ type: 'tool_call', id: `${context.call.id}.${++count}`, name, input: given })
    }
  }

  const run = async ({ title, code, timeout_seconds: seconds = DEFAULT_SECONDS }: Input, context: ToolContext) => {
    const started = runs.start({ id: context.call.id, thread: context.conversation.id, title, code })
    const deadline = AbortSignal.timeout(seconds * 1000)
    const signal = AbortSignal.any([context.signal, deadline])
    const names = callable(tools, context)
    const outcome = await runSandboxed({ code, names, signal, call: toolCall(started, context, signal, names) })
    const ended = started.end(statusOf(outcome, signal))
    context.conversation.append(scriptEntry, ended, { turn: context.turn })
    context.signal.throwIfAborted()
    if (ended.status === 'stopped') throw new Error(withPrinted(limitLead(seconds), outcome, callsNote(ended)))
    if (ended.status === 'failed') throw new Error(withPrinted(`The script failed: ${outcome.error}`, outcome))
    return printedText(outcome)
  }

  return {
    name: NAME,
    description: DESCRIPTION,
    environment: ENVIRONMENT,
    input,
    act: ({ title }) => ({ effect: 'read', summary: title }),
    timeoutMs: MOST_SECONDS * 1000 + STOP_GRACE_MS,
    run,
  }
}

export { scriptTool }
