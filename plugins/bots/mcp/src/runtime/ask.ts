import type { BotEntry } from '@sand/bots/contract'
import { type Block, type Message, type Prompt, textOf } from '@sand/chats/contract'
import type { SendResult, TurnInfo, TurnOrigin } from '@sand/engine/contract'
import { oneLine, timestamp } from '@sand/util'
import type { BotAnswer, BotItem, BotPage, BotReading } from '../contract'
import type { BotsMcpContext } from './context'

export interface Asking {
  prompt: Prompt
  origin: TurnOrigin
  clientRequestId: string
}

const defaultLimit = 50
const callLimit = 500
const resultLimit = 2_000

type Said = BotEntry & { data: Message }

export const sentAnswer = (bot: string, sent: SendResult): BotAnswer => (sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' })

const clip = (text: string) => (text.length > resultLimit ? `${text.slice(0, resultLimit)}… ${text.length - resultLimit} more characters` : text)

const namesOf = (said: Said[]) =>
  new Map(said.flatMap(({ data }) => data.content.flatMap(block => (block.type === 'tool_call' ? [[block.id, block.name] as const] : []))))

const activity = (names: Map<string, string>) => (block: Block) => {
  if (block.type === 'text') return block.text
  if (block.type === 'tool_call') return `[${block.name}] ${oneLine(JSON.stringify(block.input), callLimit)}`
  if (block.type === 'tool_result') return `[${names.get(block.callId) ?? 'tool'} result${block.isError ? ', error' : ''}] ${clip(textOf(block.content))}`
  return ''
}

const reader = (view: BotReading['view'], said: Said[]): ((message: Message) => string) => {
  if (view !== 'activity') return message => textOf(message.content)
  const text = activity(namesOf(said))
  return message => message.content.map(text).filter(Boolean).join('\n')
}

const itemOf =
  (read: (message: Message) => string) =>
  ({ seq, at, data, turn }: Said): BotItem[] => {
    const text = read(data).trim()
    return text ? [{ seq, at: timestamp(at), role: data.role, text, ...(turn && { turn }) }] : []
  }

export const createAsk = (ctx: BotsMcpContext) => {
  const known = (bot: string) => {
    if (!ctx.bots.get(bot)) throw new Error(`No bot ${bot}`)
    return bot
  }

  const answerOf = (bot: string, info: TurnInfo): BotAnswer => {
    const reply = ctx.botTurns.final(bot, info.id)
    return { bot, turn: info.id, status: info.status, ...(reply && { reply }), ...(info.error && { error: info.error }) }
  }

  return {
    send: (bot: string, asking: Asking) => ctx.botTurns.send(known(bot), asking),
    async wait(answer: BotAnswer, signal: AbortSignal): Promise<BotAnswer> {
      if (!answer.turn) return answer
      const info = await ctx.botTurns.ended(answer.turn, signal)
      if (info.conversation !== answer.bot) throw new Error(`No turn ${answer.turn} of bot ${answer.bot}`)
      return answerOf(answer.bot, info)
    },
    read(bot: string, { query, view, after, before = Infinity, limit = defaultLimit }: BotReading): BotPage {
      const said = ctx.bots
        .conversation(bot)
        .entries()
        .filter((entry): entry is Said => entry.type === 'message')
      const needle = query?.toLowerCase()
      const found = said
        .filter(entry => entry.seq > (after ?? 0) && entry.seq < before)
        .flatMap(itemOf(reader(view, said)))
        .filter(item => !needle || item.text.toLowerCase().includes(needle))
      const items = after === undefined ? found.slice(-limit) : found.slice(0, limit)
      return { bot, items, more: found.length > items.length }
    },
  }
}

export type Ask = ReturnType<typeof createAsk>
