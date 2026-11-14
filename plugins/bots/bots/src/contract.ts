import type { AppendMeta, Entry } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings, type SessionSettings } from '@sand/model/contract'
import type { WaitReason } from '@sand/turns-contract/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { lazy } from '@sand/util'
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
  entry: string
  role: 'user' | 'assistant'
  text: string
  at: number
  gist?: string
}

export const gistEntry = 'bot-gist'

export interface GistEntry {
  entry: string
  text: string
}

export const botName = (bot: Pick<Bot, 'name'>) => bot.name || 'New bot'

export type Changer = { kind: 'user' } | { kind: 'agent' } | { kind: 'bot' | 'thread'; id: string; label: string }

export const changeEntry = 'bot-change'

export interface ChangeEntry {
  by: Changer
  before: BotPatch
  after: BotPatch
}

export const jobStatuses = ['needs', 'on', 'paused'] as const

export type JobStatus = (typeof jobStatuses)[number]

export const runOutcomes = ['done', 'nothing', 'needs'] as const

export type RunOutcome = (typeof runOutcomes)[number]

export interface JobRun {
  entry: string
  at: number
  outcome: RunOutcome
  summary: string
}

export interface JobAsk {
  question: string
  entry: string
}

export interface Job {
  id: string
  bot: string
  title: string
  goal: string
  done: string
  paused: boolean
  status: JobStatus
  ask?: JobAsk
  runs: JobRun[]
  created: number
  updated: number
}

export const byStatus = (first: Pick<Job, 'status'>, second: Pick<Job, 'status'>) => jobStatuses.indexOf(first.status) - jobStatuses.indexOf(second.status)

export const runEntry = 'job-run'

export interface RunEntry {
  job: string
  title: string
  outcome: RunOutcome
  summary: string
  question?: string
}

export const morningEntry = 'job-morning'

export interface MorningLine {
  job: string
  title: string
  status: JobStatus
  text: string
}

export interface MorningEntry {
  lines: MorningLine[]
}

export interface Morning extends MorningEntry {
  entry: string
  at: number
}

export interface BotSummary extends Bot {
  folder: string
  status: BotStatus
  waiting?: WaitReason['kind']
  spent: number
  hold?: BotHold
  last?: LastLine
  jobs: Job[]
  morning?: Morning
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

export interface EntryRange {
  before?: number
  after?: number
  limit?: number
}

export interface Conversation {
  append(type: string, data: unknown, meta?: AppendMeta): BotEntry
  entries(): BotEntry[]
  page(range?: EntryRange): EntryPage
  entry(id: string): BotEntry | undefined
}

const modelChoice = lazy(() => sessionSettings().pick({ model: true, effort: true }))

const computer = lazy(() => z.union([z.enum(['none', 'own', 'this-pc']), z.templateLiteral(['pc:', z.string().min(1)])]))

export const projectIds = lazy(() => z.array(z.string().min(1)).transform(ids => [...new Set(ids)]))

const botFields = lazy(() => z.object({
  name: z.string().trim().min(1).max(60),
  initial: z.string().trim().min(1).max(2),
  color: z.enum(botColors),
  models: z.object({ main: modelChoice(), quick: modelChoice() }),
  computer: computer(),
  projects: projectIds(),
  paused: z.boolean(),
  budget: z.number().positive().max(1_000_000).nullable(),
}))

export const newBot = lazy(() => botFields().partial().extend({ id: z.uuid().optional() }))

export const botPatch = lazy(() => botFields().partial())

export type NewBot = z.infer<ReturnType<typeof newBot>>

export type BotPatch = z.infer<ReturnType<typeof botPatch>>

export const jobTextLimit = 2_000

export const summaryLimit = 300

const jobFields = lazy(() =>
  z.object({
    title: z.string().trim().min(1).max(60).describe('A short name the user sees, like "Morning CI triage"'),
    goal: z.string().trim().min(1).max(jobTextLimit).describe('What the job is for, in a sentence, like "Check failing CI on main every weekday morning."'),
    done: z
      .string()
      .trim()
      .min(1)
      .max(jobTextLimit)
      .describe('What done right looks like, in a sentence, like "Every red build has an owner or a fix PR."'),
  }),
)

export const newJob = lazy(() => jobFields().extend({ bot: z.string().optional().describe('The bot it belongs to (default: you, when you are a bot)') }))

export const jobPatch = lazy(() => jobFields().partial().extend({ paused: z.boolean().optional().describe('Pause it, or resume it with false') }))

const runFields = lazy(() =>
  z.object({
    job: z.string().describe('The job id'),
    outcome: z.enum(runOutcomes).describe('done when you did work, nothing when there was nothing to do, needs when the user has to decide'),
    summary: z.string().trim().max(summaryLimit).optional().describe('One line on what you did, like "Fixed 2 failures, opened PR #412"; needed unless outcome is nothing'),
    question: z.string().trim().max(jobTextLimit).optional().describe('What the user has to decide, with what they need to know; only and always with outcome needs'),
  }),
)

export const runReport = lazy(() =>
  runFields()
    .refine(({ outcome, summary }) => outcome === 'nothing' || Boolean(summary), { message: 'Say what you did in summary' })
    .refine(({ outcome, question }) => (outcome === 'needs') === Boolean(question), { message: 'Ask a question with outcome needs, and only then' }),
)

export type NewJob = z.infer<ReturnType<typeof newJob>>

export type JobPatch = z.infer<ReturnType<typeof jobPatch>>

export type RunReport = Omit<z.infer<ReturnType<typeof runReport>>, 'job'>

export interface Jobs {
  get(id: string): Job | undefined
  create(bot: string, spec: Omit<NewJob, 'bot'>): Job
  update(id: string, patch: JobPatch): Job
  remove(id: string): boolean
  report(id: string, report: RunReport): Job
}

export interface Bots {
  list(): BotSummary[]
  get(id: string): BotSummary | undefined
  create(spec: NewBot): BotSummary
  update(id: string, patch: BotPatch, by: Changer): BotSummary
  remove(id: string): boolean
  status(id: string, status: BotStatus, waiting?: WaitReason['kind']): void
  conversation(id: string): Conversation
  folder(id: string): string
  jobs: Jobs
}

export const bots = service<Bots>('bots')

export const runPrompt = (job: Pick<Job, 'id' | 'title'>) => `This run is for your job “${job.title}” (job ${job.id}). When you finish, report it with job_report.`

export const checkJob = (found: Bots | undefined, job: string | undefined, bot: string) => {
  if (job && found?.jobs.get(job)?.bot !== bot) throw new Error(`No job ${job} for this bot`)
}

export const botRoute = 'bot'

export interface BotViews {
  open(bot: string, tab?: string): void
}

export const botViews = service<BotViews>('botViews')

export interface BotRoster {
  list(): BotSummary[] | undefined
  find(id: string): BotSummary | undefined
}

export const botRoster = service<BotRoster>('botRoster')

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
export const jobRemove = event<(job: Job) => void>('job.remove')

export const botChangeWire = wireEvent<BotSummary>('bot.change')
export const botRemoveWire = wireEvent<string>('bot.remove')
export const botEntryWire = wireEvent<BotEntry>('bot.entry')

export const helloBots = helloField<BotSummary[]>('bots')

const one = lazy(() => z.object({ bot: z.string() }))

export const botList = request('bot.list', { input: () => z.object({}), output: type<BotSummary[]>(), callers: 'any' })
export const botCreate = request('bot.create', { input: newBot, output: type<BotSummary>(), callers: 'any' })
export const botUpdate = request('bot.update', { input: () => z.object({ bot: z.string().optional(), patch: botPatch() }), output: type<BotSummary>(), callers: 'any' })
export const botDelete = request('bot.delete', { input: one, output: type<boolean>(), callers: 'any' })

const oneJob = lazy(() => z.object({ job: z.string().describe('The job id') }))

export const jobCreate = request('job.create', { input: newJob, output: type<Job>(), callers: 'any' })
export const jobUpdate = request('job.update', { input: () => oneJob().extend({ patch: jobPatch() }), output: type<Job>(), callers: 'any' })
export const jobDelete = request('job.delete', { input: oneJob, output: type<boolean>(), callers: 'any' })
export const jobReport = request('job.report', { input: runReport, output: type<Job>(), callers: 'any' })
