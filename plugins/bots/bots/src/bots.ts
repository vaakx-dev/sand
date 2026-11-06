import type { AppendMeta } from '@sand/chats/contract'
import type { Ledger } from '@sand/ledger/contract'
import { uuid } from '@sand/util'
import type { Context } from 'drydock'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { type Bot, botChange, botEntry, botRemove, type Bots, type BotStatus, type BotSummary, freshColor, type ModelChoice, type NewBot } from './contract'
import { createEntries } from './entries'
import { lastLine } from './last'
import { createRecords } from './records'

const scanned = 20

const initialOf = (name: string) => [...name.trim()][0]!.toUpperCase()

export const createBots = (ctx: Context, { db, tx }: Ledger, root: string, quick: (main: ModelChoice) => ModelChoice): Bots => {
  const records = createRecords(db)
  const entries = createEntries(db)
  const statuses = new Map<string, BotStatus>()

  const summary = (bot: Bot): BotSummary => {
    const last = lastLine(entries.newest(bot.id, 'message', scanned))
    return { ...bot, status: statuses.get(bot.id) ?? 'idle', ...(last ? { last } : {}) }
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

  const append = (bot: string, type: string, data: unknown, meta?: AppendMeta) => {
    const entry = entries.append(known(bot).id, type, data, meta)
    ctx.emit(botEntry, entry)
    if (type === 'message') changed(bot)
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
        initial: initialOf(spec.name),
        color: freshColor(records.list()),
        job: '',
        computer: 'none',
        ...spec,
        models: { main, quick: spec.models?.quick.model ? spec.models.quick : quick(main) },
        created: now,
        updated: now,
      }
      records.save(bot)
      return changed(bot.id)
    },
    update(id, patch) {
      records.save({ ...known(id), ...patch, updated: Date.now() })
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
    status(id, status) {
      if (!records.get(id) || (statuses.get(id) ?? 'idle') === status) return
      statuses.set(id, status)
      changed(id)
    },
    conversation: id => ({
      append: (type, data, meta) => append(id, type, data, meta),
      entries: () => entries.entries(known(id).id),
      page: (before, limit) => entries.page(known(id).id, before, limit),
    }),
    folder: id => join(root, id),
  }
}
