import type { ToolSpec } from '@sand/accounts/contract'
import type { Message, ToolCallBlock, ToolResultBlock, ToolResultContent } from '@sand/chats/contract'
import type { Conversation, Owner, WaitReason } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service, type Dispose } from 'drydock'
import { z, type output, type ZodType } from 'zod'

export interface ToolContext {
  cwd: string
  signal: AbortSignal
  conversation: Conversation
  call: ToolCallBlock
  turn: string
  progress(text: string): void
  wait(reason: WaitReason): Dispose
}

export type ToolOutput = string | ToolResultContent[]

export const needs = ['thread', 'folder', 'pc', 'computer', 'routines'] as const

export type Need = (typeof needs)[number]

export type Offer = (conversation: Conversation) => readonly Need[]

export const effects = ['read', 'write', 'run', 'send', 'spend', 'delete'] as const

export type Effect = (typeof effects)[number]

export interface Act {
  effect: Effect
  paths?: string[]
  summary?: string
}

export interface Tool<S extends ZodType = ZodType> {
  name: string
  description: string
  environment?: string
  group?: string
  parallel?: boolean
  timeoutMs?: number
  input: S
  needs?: Need[]
  effect?: Effect
  act?(input: output<S>, conversation: Conversation): Act
  active?(conversation: Conversation): boolean
  replaces?: string[]
  run(input: output<S>, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

export type Gate = (act: Act, tool: Tool, context: ToolContext) => Promise<string | undefined>

export type ToolLoad = 'always' | 'on-demand' | 'off'

export interface ToolGroup {
  name: string
  label: string
  summary: string
  load: ToolLoad
}

export interface GroupState extends ToolGroup {
  chosen: ToolLoad
  tools: string[]
}

export interface Tools {
  register(tool: Tool): Dispose
  group(group: ToolGroup): Dispose
  offer(owner: Owner, offer: Offer): Dispose
  gate(gate: Gate): Dispose
  groups(): GroupState[]
  choose(group: string, load: ToolLoad): Promise<void>
  specs(messages: Message[], conversation: Conversation): ToolSpec[]
  notes(conversation: Conversation): string[]
  parallel(call: ToolCallBlock, conversation: Conversation): boolean
  effect(call: ToolCallBlock, conversation: Conversation): Effect | undefined
  run(call: ToolCallBlock, context: Omit<ToolContext, 'call'>): Promise<ToolResultBlock>
}

export const tools = service<Tools>('tools')

export const toolsChange = event<() => void>('tools.change')

export const toolsChangeWire = wireEvent<GroupState[]>('tools.change')

export const toolsGroups = request('tools.groups', { input: z.object({}), output: type<GroupState[]>() })
export const toolsChoose = request('tools.choose', {
  input: z.object({ group: z.string(), load: z.enum(['always', 'on-demand', 'off']) }),
  output: type<GroupState[]>(),
})
