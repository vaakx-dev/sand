import type { AppendMeta, Entry } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings, type SessionSettings } from '@sand/model/contract'
import { type Dispose, event, service } from 'drydock'
import { z } from 'zod'

export const botColors = ['gold', 'sky', 'orange', 'green', 'red', 'grey'] as const

export type BotColor = (typeof botColors)[number]

export const freshColor = (taken: Pick<Bot, 'color'>[]): BotColor => {
  const uses = (color: BotColor) => taken.filter(bot => bot.color === color).length
  return botColors.reduce((best, color) => (uses(color) < uses(best) ? color : best))
}

export type ModelChoice = Pick<SessionSettings, 'model' | 'effort'>

export interface ModelPolicy {
  main: ModelChoice
  quick: ModelChoice
}

export type Computer = 'none' | 'own' | 'this-pc' | `pc:${string}`

export interface Bot {
  id: string
  name: string
  initial: string
  color: BotColor
  job: string
  models: ModelPolicy
  computer: Computer
  created: number
  updated: number
}

export type BotStatus = 'idle' | 'working' | 'waiting' | 'failed'

export interface LastLine {
  role: 'user' | 'assistant'
  text: string
  at: number
}

export interface BotSummary extends Bot {
  status: BotStatus
  last?: LastLine
}

export interface BotEntry {
  id: string
  bot: string
  seq: number
  at: number
  type: string
  data: unknown
  turn?: string
}

export const chatEntry = ({ bot, ...entry }: BotEntry, parent: string | null): Entry => ({ ...entry, session: bot, parent })

export const chatPath = (entries: BotEntry[]): Entry[] => entries.map((entry, at) => chatEntry(entry, entries[at - 1]?.id ?? null))

export interface EntryPage {
  entries: BotEntry[]
  more: boolean
}

export interface Conversation {
  append(type: string, data: unknown, meta?: AppendMeta): BotEntry
  entries(): BotEntry[]
  page(before?: number, limit?: number): EntryPage
}

const modelChoice = sessionSettings.pick({ model: true, effort: true })

const computer = z.union([z.enum(['none', 'own', 'this-pc']), z.templateLiteral(['pc:', z.string().min(1)])])

const botFields = z.object({
  name: z.string().trim().min(1).max(60),
  initial: z.string().trim().min(1).max(2),
  color: z.enum(botColors),
  job: z.string().max(20_000),
  models: z.object({ main: modelChoice, quick: modelChoice }),
  computer,
})

export const newBot = botFields.partial().required({ name: true }).extend({ id: z.uuid().optional() })

export const botPatch = botFields.partial()

export type NewBot = z.infer<typeof newBot>

export type BotPatch = z.infer<typeof botPatch>

export interface Bots {
  list(): BotSummary[]
  get(id: string): BotSummary | undefined
  create(spec: NewBot): BotSummary
  update(id: string, patch: BotPatch): BotSummary
  remove(id: string): boolean
  status(id: string, status: BotStatus): void
  conversation(id: string): Conversation
  folder(id: string): string
}

export const bots = service<Bots>('bots')

export type BotFace = Pick<Bot, 'id' | 'color'> & { status?: BotStatus }

export interface BotViews {
  open(bot: string): void
  avatar(face: () => BotFace, size: number): HTMLElement
}

export const botViews = service<BotViews>('botViews')

export interface BotProfileSection {
  id: string
  order?: number
  render(bot: string): HTMLElement
}

export interface BotProfile {
  section(section: BotProfileSection): Dispose
}

export const botProfile = service<BotProfile>('botProfile')

export const botChange = event<(bot: BotSummary) => void>('bot.change')
export const botRemove = event<(id: string) => void>('bot.remove')
export const botEntry = event<(entry: BotEntry) => void>('bot.entry')

export const botChangeWire = wireEvent<BotSummary>('bot.change')
export const botRemoveWire = wireEvent<string>('bot.remove')
export const botEntryWire = wireEvent<BotEntry>('bot.entry')

const one = z.object({ bot: z.string() })

export const botList = request('bot.list', { input: z.object({}), output: type<BotSummary[]>() })
export const botGet = request('bot.get', { input: one, output: type<BotSummary | null>() })
export const botCreate = request('bot.create', { input: newBot, output: type<BotSummary>() })
export const botUpdate = request('bot.update', { input: one.extend({ patch: botPatch }), output: type<BotSummary>() })
export const botDelete = request('bot.delete', { input: one, output: type<boolean>() })
export const botConversation = request('bot.conversation', {
  input: one.extend({ before: z.number().int().optional(), limit: z.number().int().min(1).max(500).optional() }),
  output: type<EntryPage>(),
})
