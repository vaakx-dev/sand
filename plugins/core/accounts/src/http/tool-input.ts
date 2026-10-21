import type { ToolCallBlock } from '@sand/chats/contract'
import { isRecord } from '@sand/util'

export const parseToolInput = (block: ToolCallBlock, json: string) => {
  if (!json.trim()) return
  try {
    const input: unknown = JSON.parse(json)
    if (isRecord(input)) block.input = input
    else block.malformed = json
  } catch {
    block.malformed = json
  }
}
