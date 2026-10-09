import type { Dispose } from 'drydock'
import type { output, ZodType } from 'zod'
import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { ToolCallBlock, ToolResultBlock, UserContent } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'

export interface ToolContext {
  cwd: string
  signal: AbortSignal
  session: Session
  call: ToolCallBlock
}

export type ToolOutput = string | UserContent[]

export interface Tool<S extends ZodType = ZodType> {
  name: string
  description: string
  environment?: string
  input: S
  run(input: output<S>, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

export interface Tools {
  register(tool: Tool<any>): Dispose
  list(): Tool<any>[]
  specs(): ToolSpec[]
  notes(): string[]
  run(call: ToolCallBlock, context: Omit<ToolContext, 'call'>): Promise<ToolResultBlock>
}

declare module 'drydock' {
  interface Services {
    tools: Tools
  }
}
