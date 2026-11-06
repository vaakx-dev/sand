import type { LiveBlock } from '@sand/accounts/contract'
import { botInterrupt, botLive, botSend, botStreamWire } from '@sand/bot-turns/contract'
import { botConversation, botEntryWire, type BotEntry } from '@sand/bots/contract'
import { wireHello } from '@sand/devices-contract'
import { applyLiveEvent } from '@sand/server/contract'
import { errorMessage, uuid } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'
import { linesOf, type Line } from './entry'

const pageSize = 50

const merged = (list: BotEntry[], added: BotEntry[]) => {
  const known = new Set(list.map(entry => entry.id))
  return [...list, ...added.filter(entry => !known.has(entry.id))].sort((a, b) => a.seq - b.seq)
}

const isReply = (entry: BotEntry) => entry.type === 'turn-ending' || (entry.type === 'message' && linesOf([entry]).some(line => line.kind === 'assistant'))

const withoutDelivered = (pending: Line[], entry: BotEntry) => {
  const said = linesOf([entry]).find(line => line.kind === 'user')
  const index = said ? pending.findIndex(line => line.text === said.text) : -1
  return index < 0 ? pending : pending.filter((_, at) => at !== index)
}

export const conversation = (ctx: BotsContext, bot: string) => {
  const entries = sig<BotEntry[] | undefined>(undefined)
  const pending = sig<Line[]>([])
  const live = sig<LiveBlock[]>([])
  const more = sig(false)
  const loading = sig(false)
  const failure = sig<string | undefined>(undefined)
  const lines = derive(() => [...linesOf(entries.get() ?? []), ...pending.get()])

  const add = (added: BotEntry[]) => entries.update(list => merged(list ?? [], added))

  const arrived = (entry: BotEntry) => {
    add([entry])
    pending.update(list => withoutDelivered(list, entry))
    if (isReply(entry)) live.set([])
  }

  const fetch = async (before?: number) => {
    const first = entries.get() === undefined
    loading.set(true)
    try {
      const page = await ctx.wire.call(botConversation, { bot, limit: pageSize, ...(before !== undefined && { before }) })
      add(page.entries)
      if (first || before !== undefined) more.set(page.more)
      failure.set(undefined)
    } catch (error) {
      failure.set(errorMessage(error))
    } finally {
      loading.set(false)
    }
  }

  const catchUp = () =>
    ctx.wire.call(botLive, { bot }).then(
      blocks => live.set(blocks),
      error => ctx.report(error),
    )

  const refresh = () => {
    void fetch()
    void catchUp()
  }

  const older = () => {
    const oldest = entries.get()?.[0]
    if (!oldest || !more.get() || loading.get()) return Promise.resolve()
    return fetch(oldest.seq)
  }

  const send = async (text: string) => {
    const id = uuid()
    pending.update(list => [...list, { id, kind: 'user', text }])
    try {
      await ctx.wire.call(botSend, { bot, prompt: text, clientRequestId: id })
    } catch (error) {
      pending.update(list => list.filter(line => line.id !== id))
      throw error
    }
  }

  const stops = [
    ctx.wire.on(botEntryWire, entry => {
      if (entry.bot === bot) arrived(entry)
    }),
    ctx.wire.on(botStreamWire, ([from, event]) => {
      if (from === bot) live.update(blocks => applyLiveEvent(blocks, event))
    }),
    ctx.on(wireHello, refresh),
  ]
  refresh()

  return {
    entries,
    lines,
    live,
    more,
    loading,
    failure,
    older,
    send,
    interrupt: () => ctx.wire.call(botInterrupt, { bot }).then(() => undefined),
    retry: () => void fetch(),
    stop: () => {
      for (const stop of stops) void stop()
    },
  }
}

export type Conversation = ReturnType<typeof conversation>
