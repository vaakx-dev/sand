import type { AgentAccess } from '@sand/devices-contract'
import type { Call } from '@sand/orchestrator/contract'
import { type Dispose, service } from 'drydock'
import type { output, ZodObject } from 'zod'

export interface McpToolContext {
  call: Call
  here?: string
}

export interface McpTool<S extends ZodObject = ZodObject> {
  name: string
  description: string
  input: S
  access: AgentAccess
  run(input: output<S>, context: McpToolContext): Promise<unknown>
}

export interface McpTools {
  register<S extends ZodObject>(tool: McpTool<S>): Dispose
}

export const mcpTools = service<McpTools>('mcpTools')
