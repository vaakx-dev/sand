import type { Block, LLMEvent } from '@sand/protocol'

const prefix = 'mcp_'

export const prefixName = (name: string) => `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`

const guess = (name: string) => {
  const bare = name.startsWith(prefix) ? name.slice(prefix.length) : name
  return `${bare.charAt(0).toLowerCase()}${bare.slice(1)}`
}

type Named = { name?: unknown; type?: unknown }

export const prefixTools = <T extends { tools?: Named[]; messages: { content: Named[] }[] }>(payload: T) => {
  const names = new Map<string, string>()
  const rename = (name: string) => {
    const prefixed = prefixName(name)
    names.set(prefixed, name)
    return prefixed
  }
  const tools = payload.tools?.map(tool => (typeof tool.name === 'string' ? { ...tool, name: rename(tool.name) } : tool))
  const messages = payload.messages.map(message => ({
    ...message,
    content: message.content.map(block => (block.type === 'tool_use' && typeof block.name === 'string' ? { ...block, name: rename(block.name) } : block)),
  }))
  const original = (name: string) => names.get(name) ?? guess(name)
  return { payload: { ...payload, messages, ...(tools && { tools }) } as T, original }
}

const restoreBlock = (block: Block, original: (name: string) => string): Block =>
  block.type === 'tool_call' ? { ...block, name: original(block.name) } : block

export async function* restoreNames(events: AsyncIterable<LLMEvent>, original: (name: string) => string): AsyncIterable<LLMEvent> {
  for await (const event of events) {
    if (event.type === 'tool_call') yield { ...event, name: original(event.name) }
    else if (event.type === 'block') yield { ...event, block: restoreBlock(event.block, original) }
    else if (event.type === 'done') yield { ...event, message: { ...event.message, content: event.message.content.map(block => restoreBlock(block, original)) } }
    else yield event
  }
}
