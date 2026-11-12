import { McpServer } from '@modelcontextprotocol/server'
import type { AgentAccess } from '@sand/devices-contract'
import { type Call, failure, failureOf } from '@sand/orchestrator/contract'
import type { McpTool } from './contract'
import { resultText } from './result'

export type Use = <T>(work: (call: Call) => Promise<T>) => Promise<T>

export interface ServerOptions {
  access: AgentAccess
  here?: string
}

const annotations: Record<AgentAccess, { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint: boolean }> = {
  read: { readOnlyHint: true, openWorldHint: false },
  operate: { destructiveHint: false, openWorldHint: false },
}

const answer = (value: unknown) => ({ content: [{ type: 'text' as const, text: resultText(value) }] })

const respond = async (work: () => Promise<unknown>) => {
  try {
    return answer(await work())
  } catch (error) {
    return { ...answer({ error: failureOf(error) }), isError: true }
  }
}

const deny = async () => {
  throw failure('denied', 'This agent may only read; give it operate access in sand to start, message or stop anything')
}

export const mcpServer = (use: Use, tools: McpTool[], { access, here }: ServerOptions) => {
  const server = new McpServer({ name: 'sand', version: '1.0.0' })
  for (const tool of tools) {
    const allowed = tool.access === 'read' || access === 'operate'
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.input, annotations: annotations[tool.access] }, (input, { mcpReq: { signal } }) =>
      respond(allowed ? () => use(call => tool.run(input, { call, signal, ...(here && { here }) })) : deny),
    )
  }
  return server
}
