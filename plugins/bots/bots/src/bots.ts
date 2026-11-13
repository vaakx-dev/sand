import type { LLM } from '@sand/accounts/contract'
import type { AppendMeta } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import type { Ledger } from '@sand/ledger/contract'
import { billedCost } from '@sand/usage/contract'
import { dollars, uuid } from '@sand/util'
import type { Context } from 'drydock'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Bot,
  botChange,
  botEntry,
  type BotHold,
  botName,
  type BotPatch,
  botRemove,
  type Bots,
  type BotSummary,
  changeEntry,
  type ChangeEntry,
  freshColor,
  gistEntry,
  type ModelChoice,
  type NewBot,
} from './contract'
import { createEntries } from './entries'
import { lastLine } from './last'
import { createRecords } from './records'

const scanned = 20

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

export const createBots = (ctx: Context, { db, tx }: Ledger, root: string, llm: LLM, quick: (main: ModelChoice) => ModelChoice): Bots => {
  const records = createRecords(db)
  const entries = createEntries(db)
  const statuses = new Map<string, Pick<BotSummary, 'status' | 'waiting'>>()
  const folderOf = (id: string) => join(root, id)

  const summary = (bot: Bot): BotSummary => {
    const last = lastLine(entries.newest(bot.id, 'message', scanned), entries.newest(bot.id, gistEntry, 1))
    const spent = billedCost(entries.usage(bot.id, monthStart()), llm)
    const hold = holdOf(bot, spent)
    return { ...bot, folder: folderOf(bot.id), ...(statuses.get(bot.id) ?? { status: 'idle' }), spent, ...(hold && { hold }), ...(last ? { last } : {}) }
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

  const append = (bot: string, type: string, data: unknown, meta?: AppendMeta) => {
    const before = type === 'usage' ? summary(known(bot)).hold : undefined
    const entry = entries.append(known(bot).id, type, data, meta)
    ctx.emit(botEntry, entry)
    if (type !== 'message' && type !== 'usage' && type !== gistEntry) return entry
    const after = changed(bot)
    if (type === 'usage' && after.hold === 'limit' && before !== 'limit') reached(after)
    return entry
  }

  return {
    list: () => records.list().map(summary),
    get(id) {
      const bot = records.get(id)
      return bot && summary(bot)
    },
    create(spec: NewBot) {
      const now = Date.now()
      const main = spec.models?.main ?? {}
      if (spec.id && records.get(spec.id)) throw new Error(`Bot ${spec.id} already exists`)
      const bot: Bot = {
        id: uuid(),
        name: '',
        initial: initialOf(spec.name),
        color: freshColor(records.list()),
        job: '',
        computer: 'none',
        projects: [],
        paused: false,
        budget: null,
        ...spec,
        models: { main, quick: spec.models?.quick.model ? spec.models.quick : quick(main) },
        created: now,
        updated: now,
      }
      records.save(bot)
      return changed(bot.id)
    },
    update(id, patch, by) {
      const bot = known(id)
      const keys = changedKeys(bot, patch)
      records.save({ ...bot, ...patch, updated: Date.now() })
      if (keys.length) append(id, changeEntry, { by, before: pick(bot, keys), after: pick(patch, keys) } satisfies ChangeEntry)
      return changed(id)
    },
    remove(id) {
      const removed = tx(() => {
        entries.remove(id)
        return records.remove(id)
      })
      if (!removed) return false
      statuses.delete(id)
      rmSync(join(root, id), { recursive: true, force: true })
      ctx.emit(botRemove, id)
      return true
    },
    status(id, status, waiting) {
      const current = statuses.get(id)
      if (!records.get(id) || ((current?.status ?? 'idle') === status && current?.waiting === waiting)) return
      statuses.set(id, { status, ...(waiting && { waiting }) })
      changed(id)
    },
    conversation: id => ({
      append: (type, data, meta) => append(id, type, data, meta),
      entries: () => entries.entries(known(id).id),
      page: range => entries.page(known(id).id, range),
      entry: entry => entries.entry(known(id).id, entry),
    }),
    folder: folderOf,
  }
}
