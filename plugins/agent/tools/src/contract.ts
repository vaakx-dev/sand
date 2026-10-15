import type { Dispose } from 'drydock'
import type { output, ZodType } from 'zod'
import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { Message, ToolCallBlock, ToolResultBlock, ToolResultContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'

export interface ToolContext {
  cwd: string
  signal: AbortSignal
  session: Session
  call: ToolCallBlock
}

export type ToolOutput = string | ToolResultContent[]

export interface Tool<S extends ZodType = ZodType> {
  name: string
  description: string
  environment?: string
  group?: string
  parallel?: boolean
  input: S
  run(input: output<S>, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

export type ToolLoad = 'always' | 'on-demand' | 'off'

export interface ToolGroup {
  name: string
  label: string
  summary: string
  load: Exclude<ToolLoad, 'off'>
  mainOnly?: boolean
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

declare module 'drydock' {
  interface Services {
    tools: Tools
  }

  interface Events {
    'tools.change': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'tools.groups': {}
    'tools.choose': { group: string; load: ToolLoad }
  }

  interface WireEvents {
    'tools.change': [groups: GroupState[]]
  }
}
