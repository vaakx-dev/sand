import { request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

export interface BotWatch {
  id: string
  bot: string
  label: string
  kind: string
  kindLabel: string
  target: string
  instructions: string
  info?: Record<string, string>
  created: number
  changed?: number
  error?: string
}

export interface BotWatchKind {
  kind: string
  label: string
  description: string
  input: unknown
}

const callers = 'any'
const bot = lazy(() => z.string().optional())

export const botWatchesChangeWire = wireEvent<[bot: string, watches: BotWatch[]]>('bot.watches.change')

export const botWatchList = request('bot.watch.list', { input: () => z.object({ bot: bot() }), output: type<BotWatch[]>(), callers })
export const botWatchCreate = request('bot.watch.create', {
  input: () => z.object({
    bot: bot(),
    label: z.string().trim().min(1).max(60),
    instructions: z.string().trim().min(1),
    kind: z.string().min(1),
    input: z.record(z.string(), z.unknown()),
  }),
  output: type<BotWatch>(),
  callers,
})
export const botWatchRemove = request('bot.watch.remove', { input: () => z.object({ watch: z.string() }), output: type<boolean>(), callers })
export const botWatchKinds = request('bot.watch.kinds', { input: () => z.object({}), output: type<BotWatchKind[]>(), callers })
