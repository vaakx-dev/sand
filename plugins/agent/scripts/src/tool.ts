import { errorResult, type ToolCallBlock, type ToolResultBlock, type ToolResultContent } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Logins } from '@sand/logins/contract'
import { concealBlock, findName, type Tool, type ToolContext, type ToolOutput, type Tools } from '@sand/tools/contract'
import { errorMessage, head, inputText, plural, tail } from '@sand/util'
import { z } from 'zod'
import { budget } from './budget'
import { scriptEntry, type ScriptRun, type ScriptStatus } from './contract'
import { lanes } from './lanes'
import { withLogins } from './logins'
import type { Runs } from './runs'
import { type Outcome, type Reply, runSandboxed } from './sandbox/run'

type Run = ReturnType<Runs['start']>

type Content = (content: ToolResultContent[], conversation: Conversation) => Promise<ToolResultContent[]>

interface Parts {
  tools: Tools
  runs: Runs
  content: Content
  logins(): Logins | undefined
}

interface Calling {
  run: Run
  context: ToolContext
  signal: AbortSignal
  names: string[]
  during: <T>(work: () => Promise<T>) => Promise<T>
  carried: ToolResultContent[]
}

const NAME = 'script'
const DEFAULT_SECONDS = 120
const MOST_SECONDS = 600
const MAX_OUTPUT = 30_000
const PROGRESS_CHARS = 120

const DESCRIPTION =
  'Run JavaScript that calls your tools, like `await tools.read({ path })`. This is the only way to call them. Each call returns the tool\'s text and throws on failure. Only what the script prints or returns reaches you, plus the images its tools return and the tools find_tools loads. To pass a saved login\'s value in a tool\'s input, write `login("<login id>")` or `login("<login id>/username")` where the value goes; sand puts it in when the tool runs. Not Node: no require, fs or fetch.'

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
    .describe(`Seconds the script itself may run, not counting the time its tool calls take. Default ${DEFAULT_SECONDS}`),
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

const carriedFrom = (call: ToolCallBlock, result: ToolResultBlock): ToolResultContent[] => {
  if (call.name === findName && !result.isError) return result.content
  return result.content.filter(block => block.type === 'image')
}

const unprinted = (printed: string) => (block: ToolResultContent) => block.type !== 'text' || !printed.includes(block.text)

const outputOf = (printed: string, carried: ToolResultContent[]): ToolOutput => {
  const extra = carried.filter(unprinted(printed))
  return extra.length ? [{ type: 'text', text: printed || '(no output)' }, ...extra] : printed
}

const scriptTool = ({ tools, runs, content, logins }: Parts): Tool<typeof input> => {
  const settle = async (call: ToolCallBlock, { context, signal }: Calling) => {
    try {
      const given = await withLogins(call.input, logins(), context.conversation)
      const ran = await tools.run(
        { ...call, input: given },
        { cwd: context.cwd, signal, conversation: context.conversation, within: context.call.id, turn: context.turn, progress: context.progress, wait: context.wait },
      )
      return { ...ran, content: await content(ran.content, context.conversation) }
    } catch (error) {
      return errorResult(call, errorMessage(error))
    }
  }

  const toolCall = (calling: Calling) => {
    const { run, context, signal, names, during, carried } = calling
    const lane = lanes()
    let count = 0

    const execute = async (call: ToolCallBlock): Promise<Reply> => {
      const shown = concealBlock(call, tools.secrets())
      run.record({ call: shown })
      context.progress(`${call.name} ${inputText(shown.input, PROGRESS_CHARS)}`)
      const work = () => settle(call, calling)
      const result = await during(() => (tools.parallel(call, context.conversation) ? lane.together(work) : lane.alone(work)))
      run.record({ call: shown, result })
      carried.push(...carriedFrom(call, result))
      return { text: resultText(result) || '(no output)', failed: result.isError === true }
    }

    return (asked: string, given: unknown): Promise<Reply> => {
      const name = names.find(known => known === asked) ?? names.find(known => plain(known) === plain(asked))
      if (!name) return Promise.resolve({ text: `No tool ${asked}. Search with tools.${findName}({ query }).`, failed: true })
      if (signal.aborted) return Promise.resolve({ text: 'Not run: stopped.', failed: true })
      return execute({ type: 'tool_call', id: `${context.call.id}.${++count}`, name, input: given })
    }
  }

  const run = async ({ title, code, timeout_seconds: seconds = DEFAULT_SECONDS }: Input, context: ToolContext) => {
    const started = runs.start({ id: context.call.id, thread: context.conversation.id, title, code })
    const clock = budget(seconds * 1000)
    const signal = AbortSignal.any([context.signal, clock.signal])
    const names = tools.names(context.conversation).filter(name => name !== NAME)
    const carried: ToolResultContent[] = []
    const call = toolCall({ run: started, context, signal, names, during: clock.during, carried })
    const outcome = await runSandboxed({ code, names, signal, call })
    clock.stop()
    const ended = started.end(statusOf(outcome, signal))
    context.conversation.append(scriptEntry, ended, { turn: context.turn })
    context.signal.throwIfAborted()
    if (ended.status === 'stopped') throw new Error(withPrinted(limitLead(seconds), outcome, callsNote(ended)))
    if (ended.status === 'failed') throw new Error(withPrinted(`The script failed: ${outcome.error}`, outcome))
    return outputOf(printedText(outcome), carried)
  }

  return {
    name: NAME,
    description: DESCRIPTION,
    environment: ENVIRONMENT,
    input,
    act: ({ title }) => ({ effect: 'run', summary: title }),
    timeoutMs: Number.POSITIVE_INFINITY,
    run,
  }
}

export { scriptTool }
