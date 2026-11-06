import type { Conversation } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { readLimit } from '../../contract'
import type { Ask } from '../ask'
import type { BridgeContext } from '../context'
import { type Sender, toBot } from '../relay'
import { timeoutInput, toolTimeout, waitSignal } from './wait'

export const group = 'bots'

const jobLength = 200

const senderOf = (ctx: BridgeContext, { owner, id }: Conversation): Sender =>
  owner === 'bot' ? { kind: 'bot', id, label: ctx.bots.get(id)?.name ?? 'a bot' } : { kind: 'thread', id, label: ctx.sessions.open(id)?.title || 'a thread' }

const intro: Record<Sender['kind'], (label: string) => string> = {
  bot: label => `This message is from ${label}, another of the user's bots, not from the user. Your reply goes back to it.`,
  thread: label => `This message is from the agent working in the user's thread "${label}", not from the user. Your reply goes back to it.`,
}

const listTool = (ctx: BridgeContext): Tool => ({
  name: 'bots_list',
  description: "List the user's bots with each one's job and whether it is working",
  group,
  input: z.object({}),
  effect: 'read',
  run: () => JSON.stringify(ctx.bots.list().map(bot => ({ bot: bot.id, name: bot.name, job: bot.job.slice(0, jobLength), status: bot.status }))),
})

const sendInput = z.object({
  bot: z.string().describe('The bot id'),
  prompt: z.string().min(1).describe('The task or question, with what the bot needs to know'),
  timeout_ms: timeoutInput,
})

const sendTool = (ctx: BridgeContext, ask: Ask): Tool<typeof sendInput> => ({
  name: 'bots_send',
  description:
    "Hand one of the user's bots a task or question. Waits for its reply; when it takes longer you get its turn as a handle, and bots_read shows the reply later",
  group,
  input: sendInput,
  effect: 'run',
  timeoutMs: toolTimeout,
  async run({ bot, prompt, timeout_ms }, { conversation, call, signal }) {
    if (conversation.owner === 'bot' && conversation.id === bot) throw new Error("A bot can't message itself")
    if (!ctx.bots.get(bot)) throw new Error(`No bot ${bot}`)
    const sender = senderOf(ctx, conversation)
    const asked = await ask.ask(bot, {
      prompt: toBot(sender, `${intro[sender.kind](sender.label)}\n\n${prompt}`),
      origin: sender.kind === 'bot' ? 'bot' : 'agent',
      clientRequestId: `${conversation.id}:${call.id}`,
    })
    return JSON.stringify(await ask.wait(asked, waitSignal(signal, timeout_ms)))
  },
})

const readInput = z.object({
  bot: z.string().describe('The bot id'),
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first; leave it out for the latest items'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
})

const readTool = (ask: Ask): Tool<typeof readInput> => ({
  name: 'bots_read',
  description: "Read a bot's conversation; each item has a seq to read on from and the turn it belongs to",
  group,
  input: readInput,
  effect: 'read',
  run: ({ bot, ...options }) => JSON.stringify(ask.read(bot, options)),
})

export const botTools = (ctx: BridgeContext, ask: Ask): Tool[] => [listTool(ctx), sendTool(ctx, ask), readTool(ask)]
