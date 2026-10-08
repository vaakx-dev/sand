import type { Entry, Message, Thread, ToolCallBlock, ToolResultBlock, ToolStatus } from '@sand/protocol'

export type Results = Map<string, ToolResultBlock>

export const toolResults = (thread: Thread, path: Entry[]): Results => {
  const found = new Map(thread.tools.results)
  for (const entry of path) {
    if (entry.type !== 'message') continue
    for (const block of (entry.data as Message).content) if (block.type === 'tool_result') found.set(block.callId, block)
  }
  return found
}

export const toolStatus = (call: ToolCallBlock, thread: Thread, results: Results): ToolStatus => {
  const result = results.get(call.id)
  if (result) return result.isError ? 'failed' : 'done'
  return thread.tools.running.has(call.id) ? 'running' : 'pending'
}

export const resultText = (result?: ToolResultBlock) =>
  (result?.content ?? [])
    .map(block => (block.type === 'text' ? block.text : `[${block.type}${block.name ? `: ${block.name}` : ''}]`))
    .join('\n')
    .trim()

export const partialInput = (json: string): unknown => {
  try {
    return JSON.parse(json)
  } catch {
    const fields: Record<string, string> = {}
    for (const [, key, value] of json.matchAll(/"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)/g)) fields[key!] = value!.replace(/\\n/g, '\n').replace(/\\(.)/g, '$1')
    return fields
  }
}

export const field = (input: unknown, key: string) => {
  const value = (input as Record<string, unknown> | null | undefined)?.[key]
  return typeof value === 'string' ? value : value === undefined ? '' : String(value)
}
