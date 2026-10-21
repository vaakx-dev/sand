import type { ToolSpec } from '@sand/accounts/contract'
import type { ToolResultBlock } from '@sand/chats/contract'
import { fieldsOf, type Json } from '../cli/connection'
import { toolResult } from './content'

export const serverName = 'sand'

const toolUseKey = 'claudecode/toolUseId'

const listed = (tools: ToolSpec[]) =>
  tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, annotations: { readOnlyHint: true } }))

export const toolServer = (tools: ToolSpec[], answer: (id: string) => Promise<ToolResultBlock>) => {
  const result = async (method: unknown, params: Json): Promise<Json | undefined> => {
    if (method === 'initialize') return { protocolVersion: params.protocolVersion ?? '2025-06-18', capabilities: { tools: { listChanged: true } }, serverInfo: { name: 'sand', version: '1.0.0' } }
    if (method === 'tools/list') return { tools: listed(tools) }
    if (method === 'tools/call') return toolResult(await answer(String(fieldsOf(params._meta)[toolUseKey] ?? '')))
    return undefined
  }

  return async (message: Json) => {
    if (message.id === undefined) return { jsonrpc: '2.0', result: {}, id: 0 }
    const found = await result(message.method, fieldsOf(message.params))
    if (found) return { jsonrpc: '2.0', id: message.id, result: found }
    return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `sand doesn't handle ${String(message.method)}` } }
  }
}
