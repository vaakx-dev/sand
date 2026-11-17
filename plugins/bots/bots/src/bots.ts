import type { LLM, UsageRecord } from '@sand/accounts/contract'
import { type Entry, type Session, sessionEntry, type Sessions } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import type { Ledger } from '@sand/ledger/contract'
import { turnChange, type Turns, type TurnStatus } from '@sand/turns-contract/contract'
import { billedCost } from '@sand/usage/contract'
import { dollars, uuid } from '@sand/util'
import type { Context } from 'drydock'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { morningIn, recentMessages, runsIn, talkedSince, usageSince } from './chat'
import {
  type Bot,
  botChange,
  type BotHold,
  botName,
  type BotPatch,
  botRemove,
  type Bots,
  type BotStatus,
  type BotSummary,
  changeEntry,
  type ChangeEntry,
  freshColor,
  gistEntry,
  jobRemove,
  morningEntry,
  type NewBot,
  runEntry,
} from './contract'
import { createJobs } from './jobs'
import { lastLine } from './last'
import { createRecords } from './records'

export interface BotsOptions {
  ledger: Ledger
  root: string
  llm: LLM
  sessions: Sessions
  turns: Turns
  settleDays(): number
}

const SUMMARY_TYPES = new Set(['message', 'usage', gistEntry, runEntry, morningEntry])

const STATUSES: Record<TurnStatus, BotStatus> = {
  running: 'working',
  waiting: 'waiting',
  completed: 'idle',
  interrupted: 'idle',
  failed: 'failed',
  lost: 'failed',
}

const DAY_MS = 86_400_000

const initialOf = (name = '') => [...name.trim()][0]?.toUpperCase() ?? ''

const monthStart = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(1)
  return date.getTime()
}

const pick = <T extends object>(source: T, keys: (keyof T)[]): Partial<T> => {
  const picked: Partial<T> = {}
  for (const key of keys) picked[key] = source[key]
  return picked
}

const changedKeys = (bot: Bot, patch: BotPatch) => (Object.keys(patch) as (keyof BotPatch)[]).filter(key => JSON.stringify(patch[key]) !== JSON.stringify(bot[key]))

const holdOf = ({ paused, budget }: Bot, spent: number): BotHold | undefined => {
  if (paused) return 'paused'
  if (budget !== null && spent >= budget) return 'limit'
  return undefined
}

export const createBots = (ctx: Context, { ledger: { db, tx }, root, llm, sessions, turns, settleDays }: BotsOptions): Bots => {
  const records = createRecords(db)
  const chatOf = (bot: string) => sessions.require(bot)
  const append = (bot: string, type: string, data: unknown) => chatOf(known(bot).id).append(type, data)
  const jobs = createJobs(db, {
    known: bot => known(bot).id,
    runs: bot => runsIn(sessions, chatOf(bot)),
    append,
    changed: bot => void changed(bot),
    removed: job => ctx.emit(jobRemove, job),
  })
  const folderOf = (id: string) => join(root, id)

  const statusOf = (chat: Session): Pick<BotSummary, 'status' | 'waiting'> => {
    const turn = turns.current(chat) ?? turns.list(chat, undefined, 1)[0]
    const waiting = turn?.waiting?.kind
    return { status: turn ? STATUSES[turn.status] : 'idle', ...(waiting && { waiting }) }
  }

  const workingSubagents = (id: string): number =>
    sessions.children(id).reduce((count, child) => count + (turns.current(chatOf(child.id))?.status === 'running' ? 1 : 0) + workingSubagents(child.id), 0)

  const botOf = (session: string): string | undefined => {
    if (records.get(session)) return session
    const parent = sessions.open(session)?.parent
    return parent ? botOf(parent) : undefined
  }

  const talkedOf = (bot: Bot, chat: Session) => talkedSince(sessions, chat, Date.now() - settleDays() * DAY_MS) ?? bot.created

  const summary = (bot: Bot): BotSummary => {
    const chat = chatOf(bot.id)
    const last = lastLine(recentMessages(chat), chat.latest(gistEntry))
    const spent = billedCost(usageSince(sessions, chat, monthStart()), llm)
    const hold = holdOf(bot, spent)
    const morning = morningIn(chat)
    return {
      ...bot,
      folder: folderOf(bot.id),
      talked: talkedOf(bot, chat),
      subagents: workingSubagents(bot.id),
      ...statusOf(chat),
      spent,
      ...(hold && { hold }),
      ...(last && { last }),
      jobs: jobs.list(bot.id, runsIn(sessions, chat)),
      ...(morning && { morning }),
    }
  }

  const known = (id: string) => {
    const bot = records.get(id)
    if (!bot) throw new Error(`No bot ${id}`)
    return bot
  }

  const changed = (id: string) => {
    const found = summary(known(id))
    ctx.emit(botChange, found)
    return found
  }

  const reached = (bot: BotSummary) => {
    const month = new Date().toLocaleDateString('en', { month: 'long' })
    const text = `Reached its monthly limit with ${dollars(bot.spent)} spent in ${month}. It starts again next month, or when you raise the limit.`
    ctx.get(notify)?.send({ kind: 'paused', title: botName(bot), text }).catch(error => ctx.report(error))
  }

  const reachedWith = (bot: BotSummary, usage: Entry) => bot.hold === 'limit' && bot.spent - billedCost([usage.data as UsageRecord], llm) < bot.budget!

  const entered = (bot: string, entry: Entry) => {
    const after = changed(bot)
    if (entry.type === 'usage' && reachedWith(after, entry)) reached(after)
  }

  const stopped = async (chat: Session) => {
    const turn = turns.current(chat)
    if (turn && turns.interrupt(chat, turn.id)) await turns.wait(turn.id, 'end')
  }

  ctx.on(sessionEntry, (session, entry) => {
    if (session.owner === 'bot' && SUMMARY_TYPES.has(entry.type) && records.get(session.id)) entered(session.id, entry)
  })
  ctx.on(turnChange, info => {
    const bot = botOf(info.session)
    if (bot) changed(bot)
  })

  return {
    list: () => records.list().map(summary),
    get(id) {
      const bot = records.get(id)
      return bot && summary(bot)
    },
    create(spec: NewBot) {
      const now = Date.now()
      if (spec.id && records.get(spec.id)) throw new Error(`Bot ${spec.id} already exists`)
      const bot: Bot = {
        id: uuid(),
        name: '',
        initial: initialOf(spec.name),
        color: freshColor(records.list()),
        computer: 'none',
        projects: [],
        paused: false,
        budget: null,
        ...spec,
        created: now,
        updated: now,
      }
      mkdirSync(folderOf(bot.id), { recursive: true })
      tx(() => {
        records.save(bot)
        sessions.bot(bot.id, folderOf(bot.id))
      })
      return changed(bot.id)
    },
    update(id, patch, by) {
      const bot = known(id)
      const keys = changedKeys(bot, patch)
      records.save({ ...bot, ...patch, updated: Date.now() })
      if (keys.length) append(id, changeEntry, { by, before: pick(bot, keys), after: pick(patch, keys) } satisfies ChangeEntry)
      return changed(id)
    },
    async remove(id) {
      if (!records.get(id)) return false
      const chat = chatOf(id)
      await stopped(chat)
      await sessions.remove(chat.id)
      tx(() => {
        jobs.forget(id)
        records.remove(id)
      })
      rmSync(folderOf(id), { recursive: true, force: true })
      ctx.emit(botRemove, id)
      return true
    },
    folder: folderOf,
    jobs: jobs.service,
  }
}
