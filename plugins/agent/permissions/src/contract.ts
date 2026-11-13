import type { ConversationRef, Owner } from '@sand/engine/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import type { Effect, Use } from '@sand/tools/contract'
import { lazy } from '@sand/util'
import { event, service } from 'drydock'
import { z } from 'zod'

export const modes = ['off', 'ask', 'auto'] as const

export type Mode = (typeof modes)[number]

export interface ModeState {
  mode: Mode
  from?: ConversationRef
  strict: boolean
}

export interface ModeEntry {
  owner: Owner
  id: string
  mode: Mode
}

export const verdicts = ['allow', 'deny'] as const

export type Verdict = (typeof verdicts)[number]

export interface Rule {
  id: string
  owner: Owner
  conversation: string
  title: string
  tool: string
  verdict: Verdict
  at: number
}

export type NewRule = Omit<Rule, 'id' | 'at'>

export type Outcome = 'waiting' | 'allowed' | 'denied' | 'expired' | 'cancelled'

export type Decider = 'default' | 'rule' | 'owner' | 'auto' | 'grant'

export type Late = 'allowed' | 'dismissed' | 'used'

export interface Blocked {
  summary: string
  reason: string
}

export interface Decision {
  id: string
  owner: Owner
  conversation: string
  title: string
  turn: string
  call: string
  tool: string
  effect: Effect
  uses?: Use
  summary: string
  mode: Mode
  once: boolean
  outcome: Outcome
  by?: Decider
  reason?: string
  rule?: string
  blocked: Blocked[]
  late?: Late
  at: number
  deadline?: number
  decided?: number
}

export const answers = ['once', 'always', 'deny'] as const

export type Answer = (typeof answers)[number]

export interface DecisionQuery {
  owner?: Owner
  conversation?: string
  before?: number
  limit?: number
}

export interface PermissionSettings {
  deadlineMinutes: number
  modes: ModeEntry[]
  rules: Rule[]
  decisions: Decision[]
}

export interface Permissions {
  mode(conversation: ConversationRef): ModeState
  setMode(conversation: ConversationRef, mode: Mode): ModeState
  questions(): Decision[]
  answer(id: string, answer: Answer): Decision
  decisions(query?: DecisionQuery): Decision[]
  settings(): PermissionSettings
  removeRule(id: string): void
  setDeadline(minutes: number): void
}

export const permissions = service<Permissions>('permissions')

export const permissionAsked = event<(decision: Decision) => void>('permission.asked')

export const strictness: Record<Mode, number> = { off: 0, auto: 1, ask: 2 }

export const deadlineLimits = { min: 1, max: 24 * 60 } as const

const ref = lazy(() => z.object({ owner: z.enum(['thread', 'bot']), id: z.string().min(1) }))

export const helloQuestions = helloField<Decision[]>('permissions.questions')

export const questionsWire = wireEvent<Decision[]>('permissions.questions')

export const modeWire = wireEvent<ConversationRef>('permissions.mode')

export const settingsWire = wireEvent<PermissionSettings>('permissions.settings')

export const permissionAnswer = request('permissions.answer', {
  input: () => z.object({ id: z.string().min(1), answer: z.enum(answers) }),
  output: type<Decision>(),
})

export const permissionMode = request('permissions.mode', { input: () => ref(), output: type<ModeState>(), callers: 'any' })

export const permissionModeSet = request('permissions.mode.set', {
  input: () => ref().extend({ mode: z.enum(modes) }),
  output: type<ModeState>(),
  callers: 'any',
})

export const permissionSettings = request('permissions.settings', { input: () => z.object({}), output: type<PermissionSettings>(), callers: 'any' })

export const permissionRuleRemove = request('permissions.rule.remove', { input: () => z.object({ id: z.string().min(1) }), output: type<PermissionSettings>() })

export const permissionDeadline = request('permissions.deadline', {
  input: () => z.object({ minutes: z.number().int().min(deadlineLimits.min).max(deadlineLimits.max) }),
  output: type<PermissionSettings>(),
  callers: 'any',
})
