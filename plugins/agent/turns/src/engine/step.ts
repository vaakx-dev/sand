import type { LLMEvent } from '@sand/accounts/contract'
import { type Message, textOf, type ToolResultBlock } from '@sand/chats/contract'
import { contextBuild, contextOverflow, turnInbox } from '@sand/loop/contract'
import { sumUsage, tokensOf, usageRecord } from '@sand/usage/contract'
import type { TurnsContext } from '../context'
import type { TurnStore } from '../store/turns'
import { streamStep } from './stream'
import { runTools } from './tools'
import type { TurnHooks, TurnRun } from './turn'

type Done = Extract<LLMEvent, { type: 'done' }>

const joined = (messages: Message[]) =>
  messages.reduce<Message[]>((all, message) => {
    const last = all.at(-1)
    if (last?.role === 'user' && message.role === 'user') all[all.length - 1] = { role: 'user', content: [...last.content, ...message.content] }
    else all.push(message)
    return all
  }, [])

export const createHooks = (ctx: TurnsContext, store: TurnStore, run: TurnRun): TurnHooks => {
  const { session, signal, info } = run
  const turn = { turn: info.id }

  const append = (message: Message) => session.append('message', message, turn)

  const answer = (results: ToolResultBlock[]) => results.forEach(result => append({ role: 'user', content: [result] }))

  const build = async () => {
    const request = await ctx.waterfall(contextBuild, await ctx.context.build(session), session, signal)
    return { ...request, messages: joined(request.messages), session: session.id, sessionKind: session.kind }
  }

  const stream = async () => {
    const request = await build()
    return { done: await streamStep(ctx, request, run), model: request.model }
  }

  const overflow = async (error: unknown) => !signal.aborted && Boolean(await ctx.bail(contextOverflow, session, error, signal))

  const send = async () => {
    try {
      return await stream()
    } catch (error) {
      if (!(await overflow(error))) throw error
      return stream()
    }
  }

  const record = ({ message, usage, source }: Done, model?: string) =>
    ctx.ledger.tx(() => {
      append(message)
      if (tokensOf(usage)) session.append('usage', usageRecord(ctx.llm.provider?.(model), model, usage, source), turn)
      run.usage = sumUsage(run.usage, usage)
      store.usage(info.id, run.usage)
    })

  return {
    async step() {
      store.step(info.id)
      const { done, model } = await send()
      record(done, model)
      run.partial.clear()
      run.reply = textOf(done.message.content)
      return { message: done.message, stopReason: done.stopReason }
    },
    tools: calls => runTools(ctx, calls, session, signal, result => answer([result])),
    answer,
    inbox: () => ctx.waterfall(turnInbox, [], session),
    append,
  }
}
