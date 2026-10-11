import { capital } from '@sand/kit'
import type { claudeBody } from './body'

type ClaudeBody = ReturnType<typeof claudeBody>

type Payload = Record<string, unknown>

const prefix = 'mcp_'

const prefixed = (name: string) => `${prefix}${capital(name)}`

const guess = (name: string) => {
  const bare = name.startsWith(prefix) ? name.slice(prefix.length) : name
  return `${bare.charAt(0).toLowerCase()}${bare.slice(1)}`
}

export const prefixTools = (payload: ClaudeBody) => {
  const names = new Map<string, string>()
  const rename = (name: string) => {
    const renamed = prefixed(name)
    names.set(renamed, name)
    return renamed
  }
  const renameInner = (block: Payload) => (block.type === 'tool_reference' && typeof block.tool_name === 'string' ? { ...block, tool_name: rename(block.tool_name) } : block)
  const renameBlock = (block: Payload) => {
    if (block.type === 'tool_use' && typeof block.name === 'string') return { ...block, name: rename(block.name) }
    if (block.type === 'tool_result' && Array.isArray(block.content)) return { ...block, content: block.content.map(renameInner) }
    return block
  }
  const tools = payload.tools?.map(tool => ({ ...tool, name: rename(tool.name) }))
  const messages = payload.messages.map(message => ({ ...message, content: message.content.map(renameBlock) }))
  const original = (name: string) => names.get(name) ?? guess(name)
  return { payload: { ...payload, messages, ...(tools && { tools }) }, original }
}
