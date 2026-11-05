import type { LLMEvent } from '@sand/accounts/contract'
import { type Message, promptContent, textOf, type ToolResultBlock } from '@sand/chats/contract'
import { contextBuild, contextOverflow, turnPrompt } from '@sand/turns-contract/contract'
import { sumUsage, tokensOf, usageRecord } from '@sand/usage/contract'
import type { Announce } from '../announce'
import type { TurnsContext } from '../context'
import type { Stores } from '../store'
import { streamStep } from './stream'
import { runTools } from './tools'
import type { TurnHooks, TurnRun } from './turn'
import { createWaiting } from './waiting'

type Done = Extract<LLMEvent, { type: 'done' }>

const joined = (messages: Message[]) =>
  messages.reduce<Message[]>((all, message) => {
    const last = all.at(-1)
    if (last?.role === 'user' && message.role === 'user') all[all.length - 1] = { role: 'user', content: [...last.content, ...message.content] }
    else all.push(message)
    return all
  }, [])

export const createHooks = (ctx: TurnsContext, stores: Stores, announce: Announce, run: TurnRun): TurnHooks => {
  const { session, signal, info } = run
  const turn = { turn: info.id }
  const wait = createWaiting(stores.turns, info.id, () => announce.turn(info.id))

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

  const record = ({ message, usage, source }: Done, model?: string) => {
    ctx.ledger.tx(() => {
      append(message)
      if (tokensOf(usage)) session.append('usage', usageRecord(ctx.llm.provider?.(model), model, usage, source), turn)
      run.usage = sumUsage(run.usage, usage)
      stores.turns.usage(info.id, run.usage)
    })
    announce.turn(info.id)
  }

  const steer = async () => {
    const steers = signal.aborted ? [] : stores.pending.steers(session.id)
    if (!steers.length) return false
    const expanded = await Promise.all(steers.map(item => ctx.waterfall(turnPrompt, promptContent(item.prompt), session)))
    const taken = ctx.ledger.tx(() => {
      const content = steers.flatMap((item, index) => (stores.pending.remove(session.id, item.id) ? expanded[index]! : []))
      if (content.length) append({ role: 'user', content })
      return content.length > 0
    })
    if (taken) announce.pending(session)
    return taken
  }

  return {
    async step() {
      stores.turns.step(info.id)
      const { done, model } = await send()
      record(done, model)
      run.partial.clear()
      run.reply = textOf(done.message.content)
      return { message: done.message, stopReason: done.stopReason }
    },
    tools: calls => runTools(ctx, calls, { cwd: session.cwd, signal, session, turn: info.id, wait }, result => answer([result])),
    answer,
    steer,
  }
}
