import type { Owner } from '@sand/engine/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import type { Effect } from '@sand/tools/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export const verdicts = ['allow', 'ask', 'deny'] as const

export type Verdict = (typeof verdicts)[number]

export interface Rule {
  id: string
  owner: Owner
  conversation?: string
  title?: string
  tool?: string
  effect?: Effect
  verdict: Verdict
  at: number
}

export type NewRule = Omit<Rule, 'id' | 'at'>

export type Outcome = 'waiting' | 'allowed' | 'denied' | 'cancelled'

export type Decider = 'default' | 'rule' | 'user'

export interface Decision {
  id: string
  owner: Owner
  conversation: string
  title: string
  turn: string
  call: string
  tool: string
  effect: Effect
  summary: string
  outcome: Outcome
  by?: Decider
  rule?: string
  at: number
  decided?: number
}

export const answers = ['once', 'always', 'deny'] as const

export type Answer = (typeof answers)[number]

export const modes = ['trusted', 'careful'] as const

export type Mode = (typeof modes)[number]

export interface DecisionQuery {
  owner?: Owner
  conversation?: string
  before?: number
  limit?: number
}

export interface Approvals {
  waiting(): Decision[]
  answer(id: string, answer: Answer): Decision
  decisions(query?: DecisionQuery): Decision[]
  rules(): Rule[]
  addRule(rule: NewRule): Rule
  removeRule(id: string): boolean
  mode(): Mode
  setMode(mode: Mode): void
}

export const approvals = service<Approvals>('approvals')

export const approvalAsked = event<(decision: Decision) => void>('approval.asked')

export const approvalsChange = event<(waiting: Decision[]) => void>('approvals.change')

export const approvalSettingsChange = event<() => void>('approvals.settings.change')

export interface ApprovalViews {
  card(owner: Owner, conversation: string): HTMLElement
}

export const approvalViews = service<ApprovalViews>('approvalViews')

export interface ApprovalSettings {
  mode: Mode
  rules: Rule[]
}

export const helloApprovals = helloField<Decision[]>('approvals')

export const approvalsWire = wireEvent<Decision[]>('approvals.change')

export const approvalSettingsWire = wireEvent<ApprovalSettings>('approvals.settings')

export const approvalAnswer = request('approvals.answer', {
  input: z.object({ id: z.string(), answer: z.enum(answers) }),
  output: type<Decision>(),
})

export const approvalSettings = request('approvals.settings', { input: z.object({}), output: type<ApprovalSettings>() })

export const approvalRuleRemove = request('approvals.rule.remove', { input: z.object({ id: z.string() }), output: type<ApprovalSettings>() })

export const approvalMode = request('approvals.mode', { input: z.object({ mode: z.enum(modes) }), output: type<ApprovalSettings>() })
