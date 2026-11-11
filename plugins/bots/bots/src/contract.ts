import type { AppendMeta, Entry } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings, type SessionSettings } from '@sand/model/contract'
import type { MenuAction, Status } from '@sand/ui-shell/contract'
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
  projects: string[]
  paused: boolean
  budget: number | null
  created: number
  updated: number
}

export type BotHold = 'paused' | 'limit'

export type BotStatus = 'idle' | 'working' | 'waiting' | 'failed'

export interface LastLine {
  role: 'user' | 'assistant'
  text: string
  at: number
}

export const botName = (bot: Pick<Bot, 'name'>) => bot.name || 'New bot'

export interface JobVersion {
  job: string
  replaced: number
}

export const jobEntry = 'bot-job'

export interface JobEntry {
  job: string
  previous: string
}

export interface BotSummary extends Bot {
  status: BotStatus
  spent: number
  hold?: BotHold
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

export const projectIds = z.array(z.string().min(1)).transform(ids => [...new Set(ids)])

const botFields = z.object({
  name: z.string().trim().min(1).max(60),
  initial: z.string().trim().min(1).max(2),
  color: z.enum(botColors),
  job: z.string().max(20_000),
  models: z.object({ main: modelChoice, quick: modelChoice }),
  computer,
  projects: projectIds,
  paused: z.boolean(),
  budget: z.number().positive().max(1_000_000).nullable(),
})

export const newBot = botFields.partial().extend({ id: z.uuid().optional() })

export const botPatch = botFields.partial()

export type NewBot = z.infer<typeof newBot>

export type BotPatch = z.infer<typeof botPatch>

export interface Bots {
  list(): BotSummary[]
  get(id: string): BotSummary | undefined
  create(spec: NewBot): BotSummary
  update(id: string, patch: BotPatch): BotSummary
  jobs(id: string): JobVersion[]
  remove(id: string): boolean
  status(id: string, status: BotStatus): void
  conversation(id: string): Conversation
  folder(id: string): string
}

export const bots = service<Bots>('bots')

export const botRoute = 'bot'

export interface BotViews {
  open(bot: string, tab?: string): void
}

export const botViews = service<BotViews>('botViews')

export interface BotTab {
  ref: string
  title: string
  status: Status
  note: string
  at: number
  project?: string | null
}

export interface BotTabSource {
  scheme: string
  list(bot: string): BotTab[]
  get(ref: string): BotTab | undefined
  render(ref: string): HTMLElement
}

export interface BotTabs {
  source(source: BotTabSource): Dispose
}

export const botTabs = service<BotTabs>('botTabs')

export interface BotProfileSection {
  id: string
  order?: number
  render(bot: string): HTMLElement
}

export interface BotProfile {
  section(section: BotProfileSection): Dispose
}

export const botProfile = service<BotProfile>('botProfile')

export interface BotAutomation {
  id: string
  icon: string
  title: string
  when: string
  detail?: string
  paused?: boolean
  error?: string
  actions(): MenuAction[]
}

export interface BotAutomationSource {
  id: string
  order?: number
  list(bot: string): BotAutomation[]
}

export interface BotAutomations {
  source(source: BotAutomationSource): Dispose
}

export const botAutomations = service<BotAutomations>('botAutomations')

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
export const botJobs = request('bot.jobs', { input: one, output: type<JobVersion[]>() })
export const botDelete = request('bot.delete', { input: one, output: type<boolean>() })
export const botConversation = request('bot.conversation', {
  input: one.extend({ before: z.number().int().optional(), limit: z.number().int().min(1).max(500).optional() }),
  output: type<EntryPage>(),
})
