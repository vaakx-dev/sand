import type { AgentAccess } from '@sand/devices-contract'
import type { Actor } from '@sand/host-hub/contract'
import type { Call } from '@sand/orchestrator/contract'
import type { Act } from '@sand/tools/contract'
import { type Dispose, service } from 'drydock'
import { type output, z, type ZodObject } from 'zod'

export interface McpToolContext {
  call: Call
  here?: string
  signal?: AbortSignal
}

export interface McpToolPart<S extends ZodObject = ZodObject> {
  feature: string
  fields?: (keyof output<S> & string)[]
  description?: string
}

export interface McpTool<S extends ZodObject = ZodObject> {
  name: string
  description: string
  input: S
  feature?: string
  parts?: McpToolPart<S>[]
  secret?: (keyof output<S> & string)[]
  access: AgentAccess
  act?(input: output<S>): Act
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

export const resultText = (value: unknown) => JSON.stringify(value ?? { ok: true })

const hiddenFields = (parts: McpToolPart[], on: (feature: string) => boolean) => new Set(parts.filter(part => !on(part.feature)).flatMap(part => part.fields ?? []))

const without = (input: ZodObject, hidden: ReadonlySet<string>) => (hidden.size ? z.object(Object.fromEntries(Object.entries(input.shape).filter(([field]) => !hidden.has(field)))) : input)

const withFeatures = (tool: McpTool, on: (feature: string) => boolean): McpTool => {
  const parts = tool.parts ?? []
  const described = parts.filter(part => on(part.feature)).flatMap(part => part.description ?? [])
  return { ...tool, description: [tool.description, ...described].join(' '), input: without(tool.input, hiddenFields(parts, on)) }
}

export const toolsOn = (tools: McpTool[], on: (feature: string) => boolean) =>
  tools.flatMap(tool => (tool.feature && !on(tool.feature) ? [] : [withFeatures(tool, on)]))
