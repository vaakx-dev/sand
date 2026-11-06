import type { LLMEvent } from '@sand/accounts/contract'
import { type Message, promptContent, textOf, type ToolResultBlock } from '@sand/chats/contract'
import { sumUsage, tokensOf, usageRecord } from '@sand/usage/contract'
import type { Conversation, Step } from '../contract'
import type { EngineContext } from '../context'
import { expand } from '../lifecycle/start'
import type { Owned } from '../owned'
import { streamStep } from './stream'
import { runTools } from './tools'
import type { TurnHooks, TurnRun } from './turn'
import { createWaiting } from './waiting'

type Done = Extract<LLMEvent, { type: 'done' }>

interface Sent {
  step: Step
  done: Done
}

export const createHooks = <C extends Conversation>(ctx: EngineContext, { conversations, stores, leases, announce }: Owned<C>, run: TurnRun<C>): TurnHooks => {
  const { conversation, signal, info } = run
  const turn = { turn: info.id }
  const open = new Set<string>()
  const waiting = createWaiting(stores.turns, info.id, leases.holder, () => {
    announce.turn(info.id)
    leases.check(info.id)
  })

  const append = (message: Message) => conversation.append('message', message, turn)

  const answer = (results: ToolResultBlock[]) =>
    results.forEach(result => {
      open.delete(result.callId)
      append({ role: 'user', content: [result] })
    })

  const retries = async (step: Step, error: unknown, again: boolean) => {
    if (signal.aborted) return false
    const lost = step.lost(error)
    return again && (lost || Boolean(await conversations.overflow?.(conversation, info, error, signal)))
  }

  const send = async (again = true): Promise<Sent> => {
    const step = await conversations.step(conversation, info, signal)
    if (step.thread) stores.turns.thread(info.id, step.thread)
    try {
      return { step, done: await streamStep(ctx, conversations, step.request, run) }
    } catch (error) {
      if (!(await retries(step, error, again))) throw error
      return send(false)
    }
  }

  const record = ({ step, done: { message, usage, source, native, delivered } }: Sent) => {
    const { model } = step.request
    ctx.ledger.tx(() => {
      const reply = append(message)
      if (tokensOf(usage)) conversation.append('usage', usageRecord(ctx.llm.provider?.(model), model, usage, source), turn)
      run.usage = sumUsage(run.usage, usage)
      stores.turns.usage(info.id, run.usage)
      step.settle({ usage, reply: reply.id, ...(native && { native }), ...(delivered && { delivered }) })
    })
    announce.turn(info.id)
  }

  const steer = async () => {
    const steers = signal.aborted ? [] : stores.pending.steers(conversation)
    if (!steers.length) return false
    const expanded = await Promise.all(steers.map(item => expand(ctx, conversations, promptContent(item.prompt), conversation)))
    const taken = ctx.ledger.tx(() => {
      const content = steers.flatMap((item, index) => (stores.pending.remove(conversation, item.id) ? expanded[index]! : []))
      if (content.length) append({ role: 'user', content })
      return content.length > 0
    })
    if (taken) announce.pending(conversation)
    return taken
  }

  return {
    async step() {
      stores.turns.step(info.id)
      const sent = await send()
      record(sent)
      run.partial.clear()
      const { message, stopReason } = sent.done
      run.reply = textOf(message.content)
      return { message, stopReason }
    },
    tools(calls) {
      for (const call of calls) open.add(call.id)
      return runTools(ctx, conversations, calls, { cwd: conversation.cwd, signal, conversation, turn: info.id, wait: waiting.wait }, result => answer([result]))
    },
    answer,
    steer,
    parked: () => waiting.durable(open),
  }
}
