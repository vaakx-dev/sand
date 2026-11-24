import type { ToolSpec } from '@sand/accounts/contract'
import type { ToolResultBlock } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { errorMessage } from '@sand/util'
import { mcpResult } from '../content'
import { fieldsOf, type Json } from '../json'

interface ToolCall {
  name: string
  input: Json
  meta: Json
}

interface McpTools {
  tools: ToolSpec[]
  media: Media
  call(call: ToolCall): Promise<ToolResultBlock>
  meta?: Json
}

type McpServer = (message: Json) => Promise<Json | undefined>

const SERVER_NAME = 'sand'
const SERVER_INFO = { name: SERVER_NAME, version: '1.0.0' }
const DEFAULT_PROTOCOL = '2025-06-18'
const METHOD_MISSING = -32601
const HANDLER_FAILED = -32000

const listed = (tools: ToolSpec[], meta?: Json) =>
  tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, annotations: { readOnlyHint: true }, ...(meta && { _meta: meta }) }))

const mcpServer = ({ tools, media, call, meta }: McpTools): McpServer => {
  const result = async (method: unknown, params: Json): Promise<Json | undefined> => {
    switch (method) {
      case 'initialize':
        return { protocolVersion: params.protocolVersion ?? DEFAULT_PROTOCOL, capabilities: { tools: { listChanged: true } }, serverInfo: SERVER_INFO }
      case 'ping':
        return {}
      case 'tools/list':
        return { tools: listed(tools, meta) }
      case 'tools/call':
        return mcpResult(await call({ name: String(params.name), input: fieldsOf(params.arguments), meta: fieldsOf(params._meta) }), media)
      default:
        return undefined
    }
  }

  const reply = async (id: unknown, method: unknown, params: Json): Promise<Json> => {
    try {
      const found = await result(method, params)
      if (found) return { jsonrpc: '2.0', id, result: found }
      return { jsonrpc: '2.0', id, error: { code: METHOD_MISSING, message: `sand doesn't handle ${String(method)}` } }
    } catch (error) {
      return { jsonrpc: '2.0', id, error: { code: HANDLER_FAILED, message: errorMessage(error) } }
    }
  }

  return async message => (message.id === undefined ? undefined : reply(message.id, message.method, fieldsOf(message.params)))
}

export { mcpServer, SERVER_NAME, type McpTools }
