import type { Message, ToolResultBlock, UserContent } from '@sand/messages'
import type { AppPlan, AppSession, AppSetup, LLMEvent, LLMRequest } from '../contract'
import { isUserContent } from '@sand/kit'
import { markOf, transcript } from './history'
import { createSignals, type Signals } from './signals'
import { readStep } from './step'

interface Live {
  session: AppSession
  signals: Signals
  setup: string
  marks: string[]
  waiting: string[]
  timer?: ReturnType<typeof setTimeout>
}

const idleFor = 15 * 60_000
const resume = 'Continue from where the conversation above stops.'

const setupPrint = ({ model, effort, system, tools }: AppSetup) =>
  JSON.stringify([model, effort, system, tools.map(({ name, description, inputSchema }) => [name, description, inputSchema])])

const extends1 = (before: string[], after: string[]) => after.length === before.length + 1 && before.every((mark, index) => after[index] === mark)

const userContent = (message: Message | undefined) => (message?.role === 'user' ? message.content.filter(isUserContent) : [])

const unanswered = (callId: string): ToolResultBlock => ({ type: 'tool_result', callId, content: [{ type: 'text', text: 'Not run.' }], isError: true })

const answer = (session: AppSession, message: Message, ids: string[]) => {
  const results = new Map(message.content.flatMap(block => (block.type === 'tool_result' ? [[block.callId, block] as const] : [])))
  const answers = ids.map(id => results.get(id) ?? unanswered(id))
  const extra = userContent(message)
  const last = answers.at(-1)
  if (extra.length && session.steer) session.steer(extra)
  else if (last && extra.length) answers[answers.length - 1] = { ...last, content: [...last.content, ...extra] }
  answers.forEach(result => session.answer(result.callId, result))
}

const fresh = (messages: Message[]) => {
  const last = messages.at(-1)
  const plain = last?.role === 'user' && !last.content.some(block => block.type === 'tool_result')
  if (plain) return { history: transcript(messages.slice(0, -1)), content: userContent(last) }
  const content: UserContent[] = [{ type: 'text', text: resume }]
  return { history: transcript(messages), content }
}

export type Bridge = ReturnType<typeof createBridge>

export const createBridge = (plan: AppPlan, cwd: string) => {
  const live = new Map<string, Live>()

  const drop = (key: string, entry: Live) => {
    if (live.get(key) === entry) live.delete(key)
    clearTimeout(entry.timer)
    entry.signals.close()
    entry.session.close()
  }

  const open = async (setup: AppSetup): Promise<Live> => {
    const signals = createSignals()
    const session = await plan.open(setup, signals.output)
    return { session, signals, setup: setupPrint(setup), marks: [], waiting: [] }
  }

  const carryOn = (entry: Live, marks: string[], messages: Message[], print: string) => {
    if (!extends1(entry.marks, marks)) return false
    const last = messages.at(-1)
    if (!last || last.role !== 'user') return false
    if (entry.waiting.length) {
      answer(entry.session, last, entry.waiting)
      return true
    }
    if (entry.setup !== print || last.content.some(block => block.type === 'tool_result')) return false
    entry.session.send(userContent(last))
    return true
  }

  const begin = async (key: string, setup: AppSetup, messages: Message[]) => {
    const { history, content } = fresh(messages)
    const entry = await open({ ...setup, history })
    live.set(key, entry)
    entry.session.send(content)
    return entry
  }

  const entryFor = async (key: string, setup: AppSetup, messages: Message[], marks: string[]) => {
    const found = live.get(key)
    if (found) clearTimeout(found.timer)
    if (found && carryOn(found, marks, messages, setupPrint(setup))) return found
    if (found) drop(key, found)
    return begin(key, setup, messages)
  }

  async function* stream(request: LLMRequest & { model: string }, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const key = request.session ?? `once:${crypto.randomUUID()}`
    const setup: AppSetup = {
      model: request.model,
      ...(request.effort && { effort: request.effort }),
      system: request.system,
      tools: request.session ? request.tools : [],
      history: '',
      cwd,
    }
    const marks = request.messages.map(markOf)
    const entry = await entryFor(key, setup, request.messages, marks)

    const settle = (reply: Message, paused: boolean) => {
      if (!request.session) return drop(key, entry)
      entry.waiting = paused ? reply.content.flatMap(block => (block.type === 'tool_call' ? [block.id] : [])) : []
      entry.marks = [...marks, markOf(reply)]
      entry.timer = setTimeout(() => drop(key, entry), idleFor)
      entry.timer.unref?.()
    }

    try {
      for await (const event of readStep(() => entry.signals.next(signal), request.model)) {
        if (event.type === 'done') settle(event.message, event.stopReason === 'tool_use')
        yield event
      }
    } catch (error) {
      if (signal?.aborted) entry.session.interrupt()
      drop(key, entry)
      throw error
    }
  }

  const close = () => [...live].forEach(([key, entry]) => drop(key, entry))

  return { stream, close }
}
