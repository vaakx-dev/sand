import type { ToolCallBlock } from '@sand/chats/contract'
import { z } from 'zod'

const inputSchema = z.record(z.string(), z.unknown())

export const parseToolInput = (block: ToolCallBlock, json: string) => {
  if (!json.trim()) return
  try {
    const input = inputSchema.safeParse(JSON.parse(json))
    if (input.success) block.input = input.data
    else block.malformed = json
  } catch {
    block.malformed = json
  }
}
