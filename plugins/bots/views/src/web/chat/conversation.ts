import type { LiveBlock, LiveEvent } from '@sand/accounts/contract'
import { botInterrupt, botOpen, botSend, type BotSnapshot } from '@sand/bot-turns/contract'
import { chatPath, type BotEntry } from '@sand/bots/contract'
import { textOf, type Message, type Prompt } from '@sand/chats/contract'
import { applyLiveEvent } from '@sand/server/contract'
import { errorMessage, isRecord } from '@sand/util'
import type { DeviceRecords } from '@sand/web-client/contract'
import { derive, effect, sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

export interface Pending {
  id: string
  prompt: Prompt
  at: number
}

const TAIL_ENTRIES = 60

const merged = (list: BotEntry[], added: BotEntry[]) => {
  const known = new Set(list.map(entry => entry.seq))
  return [...list, ...added.filter(entry => !known.has(entry.seq))].sort((a, b) => a.seq - b.seq)
}

const replaced = (list: BotEntry[], fresh: BotEntry[]) => {
  const last = fresh.at(-1)?.seq ?? 0
  return [...fresh, ...list.filter(entry => entry.seq > last)]
}

const isMessage = (data: unknown): data is Message =>
  isRecord(data) && (data.role === 'user' || data.role === 'assistant') && Array.isArray(data.content)

const messageOf = ({ type, data }: BotEntry) => (type === 'message' && isMessage(data) ? data : undefined)

const spoken = (message: Message) => textOf(message.content, '\n\n').trim()

const isReply = (entry: BotEntry) => {
  if (entry.type === 'turn-ending') return true
  const message = messageOf(entry)
  return message?.role === 'assistant' && Boolean(spoken(message))
}

export const conversation = (ctx: BotsContext, bot: string, kept: () => DeviceRecords<BotSnapshot> | undefined) => {
  const entries = sig<BotEntry[] | undefined>(undefined)
  const queued = sig<BotSnapshot['pending']>([])
  const live = sig<LiveBlock[]>([])
  const more = sig(false)
  const loading = sig(false)
  const failure = sig<string | undefined>(undefined)
  const path = derive(() => chatPath(entries.get() ?? []))

  const shown = (snapshot: BotSnapshot) => {
    live.set(snapshot.live)
    queued.set(snapshot.pending)
  }

  const restored = (snapshot: BotSnapshot | undefined) => {
    if (!snapshot || entries.get() !== undefined) return
    entries.set(snapshot.entries)
    more.set(snapshot.more)
    shown(snapshot)
  }

  const caughtUp = (snapshot: BotSnapshot, after: number | undefined) => {
    const list = entries.get() ?? []
    const fresh = after === undefined || snapshot.more
    entries.set(fresh ? replaced(list, snapshot.entries) : merged(list, snapshot.entries))
    if (fresh) more.set(snapshot.more)
    shown(snapshot)
  }

  const sync = async () => {
    const after = entries.get()?.at(-1)?.seq
    try {
      caughtUp(await ctx.wire.call(botOpen, { bot, ...(after !== undefined && { after }) }), after)
      failure.set(undefined)
    } catch (error) {
      failure.set(errorMessage(error))
    }
  }

  const load = async () => {
    restored(await kept()?.read(bot))
    if (ctx.wire.ready()) await sync()
  }

  const older = async () => {
    const oldest = entries.get()?.[0]
    if (!oldest || !more.get() || loading.get()) return
    loading.set(true)
    try {
      const page = await ctx.wire.call(botOpen, { bot, before: oldest.seq })
      entries.update(list => merged(list ?? [], page.entries))
      more.set(page.more)
    } catch (error) {
      ctx.report(error)
    } finally {
      loading.set(false)
    }
  }

  const tail = (): BotSnapshot | undefined => {
    const list = entries.get()
    if (!list) return undefined
    return { entries: list.slice(-TAIL_ENTRIES), more: more.get() || list.length > TAIL_ENTRIES, live: live.get(), pending: queued.get() }
  }

  const release = () => {
    const snapshot = tail()
    if (!snapshot || snapshot.entries.length === entries.get()?.length) return
    entries.set(snapshot.entries)
    more.set(true)
  }

  const send = async (prompt: Prompt, id: string) => {
    await ctx.wire.call(botSend, { bot, prompt, clientRequestId: id })
  }

  effect(() => {
    const snapshot = tail()
    if (snapshot) kept()?.write(bot, snapshot)
  })

  return {
    bot,
    entries,
    path,
    pending: queued,
    live,
    more,
    loading,
    failure,
    load,
    sync,
    older,
    send,
    release,
    arrived(entry: BotEntry) {
      entries.update(list => list && merged(list, [entry]))
      if (isReply(entry)) live.set([])
    },
    queue: (items: BotSnapshot['pending']) => queued.set(items),
    stream: (event: LiveEvent) => live.update(blocks => applyLiveEvent(blocks, event)),
    interrupt: () => ctx.wire.call(botInterrupt, { bot }).then(() => undefined),
    retry: () => void sync(),
  }
}

export type Conversation = ReturnType<typeof conversation>
