import type { ToolCallBlock } from '@sand/messages'
import { isRecord } from '@sand/kit'

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
