import type { AgentAccess } from '@sand/devices-contract'
import type { Actor } from '@sand/host-hub/contract'
import type { Call } from '@sand/orchestrator/contract'
import { type Dispose, service } from 'drydock'
import type { output, ZodObject } from 'zod'

export interface McpToolContext {
  call: Call
  here?: string
  signal?: AbortSignal
}

export interface McpTool<S extends ZodObject = ZodObject> {
  name: string
  description: string
  input: S
  access: AgentAccess
  group?: string
  agents?: Actor['owner'][]
  always?: Actor['owner'][]
  run(input: output<S>, context: McpToolContext): Promise<unknown>
}

export interface McpGroup {
  name: string
  label: string
  summary: string
}

export interface McpTools {
  register<S extends ZodObject>(tool: McpTool<S>): Dispose
  group(group: McpGroup): Dispose
}

export const mcpTools = service<McpTools>('mcpTools')
