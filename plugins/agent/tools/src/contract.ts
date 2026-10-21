import type { ToolSpec } from '@sand/accounts/contract'
import type { Message, Session, ToolCallBlock, ToolResultBlock, ToolResultContent } from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service, type Dispose } from 'drydock'
import { z, type output, type ZodType } from 'zod'

export interface ToolContext {
  cwd: string
  signal: AbortSignal
  session: Session
  call: ToolCallBlock
  progress(text: string): void
}

export type ToolOutput = string | ToolResultContent[]

export interface Tool<S extends ZodType = ZodType> {
  name: string
  description: string
  environment?: string
  group?: string
  parallel?: boolean
  input: S
  active?(session: Session): boolean
  replaces?: string[]
  run(input: output<S>, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

export type ToolLoad = 'always' | 'on-demand' | 'off'

export interface ToolGroup {
  name: string
  label: string
  summary: string
  load: Exclude<ToolLoad, 'off'>
}

export interface GroupState extends ToolGroup {
  chosen: ToolLoad
  tools: string[]
}

export interface Tools {
  register(tool: Tool): Dispose
  group(group: ToolGroup): Dispose
  groups(): GroupState[]
  choose(group: string, load: ToolLoad): Promise<void>
  specs(messages: Message[], session: Session): ToolSpec[]
  notes(session: Session): string[]
  parallel(call: ToolCallBlock, session: Session): boolean
  run(call: ToolCallBlock, context: Omit<ToolContext, 'call'>): Promise<ToolResultBlock>
}

export const tools = service<Tools>('tools')

export const toolsChange = event<() => void>('tools.change')

export const toolFolder = event<(cwd: string, session: Session) => string | undefined | Promise<string | undefined>>('tool.folder')

export const toolsChangeWire = wireEvent<GroupState[]>('tools.change')

export const toolsGroups = request('tools.groups', { input: z.object({}), output: type<GroupState[]>() })
export const toolsChoose = request('tools.choose', {
  input: z.object({ group: z.string(), load: z.enum(['always', 'on-demand', 'off']) }),
  output: type<GroupState[]>(),
})
