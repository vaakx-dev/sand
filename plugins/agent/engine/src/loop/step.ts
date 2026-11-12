import { type LLMEvent, ProviderTrouble, StreamStalled } from '@sand/accounts/contract'
import { type Message, noteBlock, promptContent, textOf, type ToolCallBlock, type ToolResultBlock } from '@sand/chats/contract'
import { conceal } from '@sand/tools/contract'
import { sumUsage, tokensOf, usageRecord } from '@sand/usage/contract'
import { untilAborted } from '@sand/util'
import type { Conversation, Step, TurnOrigin } from '../contract'
import type { EngineContext } from '../context'
import { expand } from '../lifecycle/start'
import type { Owned } from '../owned'
import { streamStep } from './stream'
import { runTools } from './tools'
import type { TurnHooks, TurnRun } from './turn'
import { createWaiting } from './waiting'

const noticeOrigins = new Set<TurnOrigin>(['job', 'wake', 'routine'])
const troublePausesMs = [1_000, 2_000, 4_000, 8_000]

type Done = Extract<LLMEvent, { type: 'done' }>

interface Sent {
  step: Step
  done: Done
}

export const createHooks = <C extends Conversation>(ctx: EngineContext, { conversations, stores, leases, announce }: Owned<C>, run: TurnRun<C>): TurnHooks => {
  const { conversation, signal, info } = run
  const turn = { turn: info.id }
  const open = new Map<string, string>()
  const wait = createWaiting(stores.turns, info.id, leases.holder, () => announce.turn(info.id))

  const append = (message: Message) => conversation.append('message', message, turn)

  const answer = (results: ToolResultBlock[]) =>
    results.forEach(result => {
      open.delete(result.callId)
      append({ role: 'user', content: [result] })
    })

  const output = (call: ToolCallBlock, text: string) => {
    if (!open.has(call.id)) return
    open.set(call.id, text)
    stores.turns.outputs(info.id, open)
  }

  const retries = async (lost: boolean, error: unknown) =>
    lost || error instanceof StreamStalled || Boolean(await conversations.overflow?.(conversation, info, error, signal))

  const pause = async (trouble: ProviderTrouble, tries: number) => {
    const pauseMs = troublePausesMs[tries]
    if (pauseMs === undefined) throw new Error(`${trouble.message}. sand tried ${tries + 1} times and gave up.`, { cause: trouble })
    await untilAborted(Bun.sleep(pauseMs), signal)
    return tries + 1
  }

  const send = async (again = true, tries = 0): Promise<Sent> => {
    const step = await conversations.step(conversation, info, signal)
    if (step.thread) stores.turns.thread(info.id, step.thread)
    try {
      return { step, done: await streamStep(ctx, conversations, step.request, run) }
    } catch (error) {
      if (signal.aborted) throw error
      const lost = step.lost(error)
      if (error instanceof ProviderTrouble) return send(again, await pause(error, tries))
      if (!again || !(await retries(lost, error))) throw error
      return send(false, tries)
    }
  }

  const record = ({ step, done: { message, usage, cacheTtlMs, source, native, delivered, finish } }: Sent) => {
    const { model } = step.request
    ctx.ledger.tx(() => {
      const reply = append(conceal(message, ctx.tools.secrets()))
      if (finish) conversation.append('finish', finish, turn)
      if (tokensOf(usage)) conversation.append('usage', usageRecord(ctx.llm.provider?.(model), model, usage, source), turn)
      run.usage = sumUsage(run.usage, usage)
      stores.turns.usage(info.id, run.usage)
      step.settle({ usage, reply: reply.id, ...(cacheTtlMs && { cacheTtlMs }), ...(native && { native }), ...(delivered && { delivered }) })
    })
    announce.turn(info.id)
  }

  const steer = async () => {
    const steers = signal.aborted ? [] : stores.pending.steers(conversation)
    if (!steers.length) return false
    const expanded = await Promise.all(steers.map(item => expand(ctx, conversations, promptContent(item.prompt), conversation)))
    const taken = ctx.ledger.tx(() => {
      const kept = steers.flatMap((item, index) => (stores.pending.remove(conversation, item.id) ? [{ at: item.at, content: expanded[index]! }] : []))
      for (const { at, content } of kept) conversation.append('message', { role: 'user', content }, { ...turn, at })
      return kept.length > 0
    })
    if (taken) announce.pending(conversation)
    return taken
  }

  let nudged = noticeOrigins.has(info.origin)
  const nudge = () => {
    if (nudged) return false
    nudged = true
    append({ role: 'user', content: [noteBlock('sand', 'Your last reply was empty. Continue the task or give your answer. If you meant to say nothing, end your turn again without writing anything.')] })
    return true
  }

  return {
    async step() {
      stores.turns.step(info.id)
      run.steps++
      const sent = await send()
      record(sent)
      run.partial.clear()
      const { message, stopReason } = sent.done
      run.reply = textOf(message.content)
      return { message, stopReason }
    },
    tools(calls) {
      for (const call of calls) open.set(call.id, '')
      return runTools(ctx, conversations, calls, { cwd: conversation.cwd, signal, conversation, turn: info.id, wait }, { answer: result => answer([result]), output })
    },
    answer,
    steer,
    nudge,
  }
}
