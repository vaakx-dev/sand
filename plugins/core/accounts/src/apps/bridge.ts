import {
  type AppPlan,
  type AppSession,
  type AppSetup,
  type Delivery,
  type LLMEvent,
  type LLMRequest,
  loadedTools,
  type NativeRef,
  ThreadLost,
  type ThreadRef,
  type ToolSpec,
} from '../contract'
import { isModelContent, type Message, type ModelContent, textOf } from '@sand/chats/contract'
import { errorMessage, untilAborted } from '@sand/util'
import type { Dispose } from 'drydock'
import { stat } from 'node:fs/promises'
import { blankFiles, secretValues } from './blank'
import { deliver } from './deliver'
import { createSignals, type Signals } from './signals'
import { readStep } from './step'

type Request = LLMRequest & { model: string }

interface Live {
  thread: string
  session: AppSession
  signals: Signals
  setup: string
  tools: string
  base: string | null
  sent: Message[]
  done: boolean
  waiting: string[]
  handoff?: { id: string; delivered: Delivery }
  calming?: Promise<void>
  timer?: ReturnType<typeof setTimeout>
  untrack?: Dispose
}

export type Track = (conversation: string, pid: number) => Dispose | undefined

interface Opened {
  entry: Live
  fresh: boolean
}

const idleFor = 15 * 60_000
const toolsRunFor = 90 * 60_000
const interruptFor = 5_000

const toolsPrint = (tools: ToolSpec[]) => Bun.hash(JSON.stringify(tools.map(({ name, description, inputSchema }) => [name, description, inputSchema]))).toString(36)

const startsWith = (messages: Message[], prefix: Message[]) => prefix.every((message, at) => JSON.stringify(messages[at]) === JSON.stringify(message))

const isFolder = (path: string) =>
  stat(path).then(
    found => found.isDirectory(),
    () => false,
  )

const noUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const keyOf = (caller: string, thread: ThreadRef) => `${caller}:${thread.id}:${thread.generation}`

const askedOf = (request: Request) => textOf(request.messages.at(-1)?.content ?? [])

const callsOf = (message: Message) => message.content.flatMap(block => (block.type === 'tool_call' ? [block.id] : []))

export type Bridge = ReturnType<typeof createBridge>

export const createBridge = (plan: AppPlan, home: string, track: Track) => {
  const live = new Map<string, Live>()
  const effortFixed = !plan.caps.reconfigure.includes('effort')

  const setupPrint = ({ model, effort, system, tools }: AppSetup) => JSON.stringify([model, system, toolsPrint(tools), effortFixed ? effort : undefined])

  const forget = (key: string, entry: Live) => {
    if (live.get(key) === entry) live.delete(key)
    clearTimeout(entry.timer)
    entry.untrack?.()
  }

  const watch = (entry: Live, conversation: string | undefined) => {
    const { pid } = entry.session
    if (entry.untrack || !conversation || pid === undefined) return
    entry.untrack = track(conversation, pid)
  }

  const drop = (key: string, entry: Live) => {
    forget(key, entry)
    entry.signals.close()
    return entry.session.close()
  }

  const blankCopy = async (key: string, entry: Live, values: string[]) => {
    await drop(key, entry)
    if (entry.session.id) await blankFiles((await plan.sessionFiles?.(entry.session.id)) ?? [], values)
  }

  const rest = (key: string, entry: Live) => {
    entry.timer = setTimeout(() => drop(key, entry), entry.waiting.length ? toolsRunFor : idleFor)
    entry.timer.unref?.()
  }

  const calm = async (key: string, entry: Live) => {
    const acked = await untilAborted(entry.session.interrupt(), AbortSignal.timeout(interruptFor)).then(
      () => true,
      () => false,
    )
    entry.calming = undefined
    if (!acked) return drop(key, entry)
    entry.signals.clear()
    rest(key, entry)
  }

  const halt = (key: string, entry: Live, signal?: AbortSignal) => {
    if (signal?.aborted && live.get(key) === entry) entry.calming = calm(key, entry)
    else drop(key, entry)
  }

  const setupOf = async (request: Request, thread?: ThreadRef): Promise<AppSetup> => ({
    model: request.model,
    ...(request.effort && { effort: request.effort }),
    system: request.system,
    tools: thread ? loadedTools(request.tools) : [],
    cwd: thread && (await isFolder(thread.cwd)) ? thread.cwd : home,
    persist: !!thread,
  })

  const open = async (key: string, thread: string, setup: AppSetup, tools: string, resume?: string): Promise<Live> => {
    let entry: Live | undefined
    const signals = createSignals(() => entry && forget(key, entry))
    const session = await plan.open(setup, signals.output, resume).catch((error: unknown) => {
      signals.close()
      throw resume ? new ThreadLost(`${plan.app} couldn't reopen this thread: ${errorMessage(error)}`) : error
    })
    entry = { thread, session, signals, setup: setupPrint(setup), tools, base: null, sent: [], done: true, waiting: [] }
    live.set(key, entry)
    return entry
  }

  const held = (key: string, thread: ThreadRef, delta: Message[]) => {
    const found = live.get(key)
    if (!found) return undefined
    clearTimeout(found.timer)
    if (found.done && thread.seenHead !== found.base) return { found, messages: delta }
    if (!found.done && thread.seenHead === found.base && startsWith(delta, found.sent)) return { found, messages: delta.slice(found.sent.length) }
    drop(key, found)
    throw new ThreadLost(`${plan.app} is out of step with this thread`)
  }

  const ready = async (key: string, found: Live | undefined, setup: AppSetup, thread: ThreadRef): Promise<Opened> => {
    const tools = toolsPrint(setup.tools)
    const started = found?.tools ?? thread.native?.tools ?? tools
    if (plan.fixedTools && started !== tools) throw new ThreadLost(`${plan.app} can't change the tools of a running thread`)
    if (found?.setup === setupPrint(setup)) return { entry: found, fresh: false }
    if (found) drop(key, found)
    const resume = found?.session.id ?? thread.native?.id
    if (resume && plan.caps.resume) return { entry: await open(key, thread.id, setup, started, resume), fresh: false }
    if (!resume && thread.fresh) return { entry: await open(key, thread.id, setup, tools), fresh: true }
    throw new ThreadLost(`${plan.app} can't continue this thread`)
  }

  const handOver = async (entry: Live, request: Request): Promise<{ lead: ModelContent[]; delivered?: Delivery }> => {
    const { handoff } = request
    if (!handoff) return { lead: [] }
    if (entry.handoff?.id === handoff.id) return { lead: [], delivered: entry.handoff.delivered }
    const injected = await (entry.session.inject?.(handoff) ?? Promise.resolve(false)).catch((error: unknown) => {
      throw new ThreadLost(`${plan.app} couldn't take the handoff: ${errorMessage(error)}`)
    })
    const delivered: Delivery = injected ? 'injected' : 'inline'
    entry.handoff = { id: handoff.id, delivered }
    return { lead: injected ? [] : [{ type: 'text', text: handoff.text }], delivered }
  }

  const nativeOf = (entry: Live, thread: ThreadRef): NativeRef | undefined =>
    entry.session.id ? { id: entry.session.id, cwd: thread.cwd, ...(plan.fixedTools && { tools: entry.tools }) } : undefined

  const read = async function* (key: string, entry: Live, model: string, signal?: AbortSignal) {
    let ended = false
    try {
      for await (const event of readStep(() => entry.signals.next(signal), model)) {
        ended = event.type === 'done'
        yield event
      }
    } finally {
      if (!ended) halt(key, entry, signal)
    }
  }

  async function* step(request: Request, thread: ThreadRef, caller: string, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const key = keyOf(caller, thread)
    await live.get(key)?.calming
    const delta = request.delta ?? []
    const { found, messages } = held(key, thread, delta) ?? { messages: delta }
    const { entry, fresh } = await ready(key, found, await setupOf(request, thread), thread)
    watch(entry, request.session)
    const { lead, delivered } = await handOver(entry, request)
    const waiting = entry.waiting
    entry.sent = entry.done ? messages : [...entry.sent, ...messages]
    entry.base = thread.seenHead
    entry.done = false
    entry.waiting = []
    deliver(entry.session, { messages, waiting, lead, replay: fresh, ...(request.effort && { effort: request.effort }) })

    for await (const event of read(key, entry, request.model, signal)) {
      if (event.type !== 'done') {
        yield event
        continue
      }
      entry.done = true
      entry.waiting = event.stopReason === 'tool_use' ? callsOf(event.message) : []
      const secrets = secretValues(event.message, request.tools)
      if (secrets.length) await blankCopy(key, entry, secrets)
      else rest(key, entry)
      const native = nativeOf(entry, thread)
      yield { ...event, ...(native && { native }), ...(delivered && { delivered }) }
    }
  }

  async function* aside(request: Request, thread: ThreadRef, caller: string, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const entry = live.get(keyOf(caller, thread))
    if (!entry?.done || !entry.session.aside) throw new Error(`${plan.app} can't answer beside this thread now`)
    yield { type: 'start', model: request.model }
    const { text, usage } = await entry.session.aside(askedOf(request), signal)
    yield { type: 'done', message: { role: 'assistant', content: text ? [{ type: 'text', text }] : [] }, stopReason: 'end_turn', usage: { ...noUsage, ...usage } }
  }

  const threaded = (request: Request, thread: ThreadRef, caller: string, signal?: AbortSignal) =>
    request.aside ? aside(request, thread, caller, signal) : step(request, thread, caller, signal)

  async function* once(request: Request, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const [message, ...more] = request.messages
    if (!message || message.role !== 'user' || more.length) throw new Error(`${plan.app} takes one message outside a chat`)
    const signals = createSignals()
    const session = await plan.open(await setupOf(request), signals.output)
    try {
      session.send(message.content.filter(isModelContent), request.effort)
      yield* readStep(() => signals.next(signal), request.model)
    } finally {
      signals.close()
      void session.close()
    }
  }

  return {
    stream: (request: Request, signal?: AbortSignal, caller = 'local') => (request.thread ? threaded(request, request.thread, caller, signal) : once(request, signal)),
    release(thread: string) {
      for (const [key, entry] of live) if (entry.thread === thread) drop(key, entry)
    },
    close: () => [...live].forEach(([key, entry]) => drop(key, entry)),
  }
}
