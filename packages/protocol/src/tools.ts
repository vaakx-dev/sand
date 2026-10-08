import type { Dispose } from 'drydock'
import type { output, ZodType } from 'zod'
import type { ToolSpec } from './llm'
import type { ToolCallBlock, ToolResultBlock, UserContent } from './message'
import type { Session } from './session'

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
  input: S
  run(input: output<S>, context: ToolContext): ToolOutput | Promise<ToolOutput>
}

export interface Tools {
  register(tool: Tool<any>): Dispose
  list(): Tool<any>[]
  specs(): ToolSpec[]
  run(call: ToolCallBlock, context: Omit<ToolContext, 'call'>): Promise<ToolResultBlock>
}
