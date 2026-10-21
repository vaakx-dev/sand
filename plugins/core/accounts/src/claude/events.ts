import type { StopReason } from '@sand/chats/contract'

export interface RawUsage {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

export interface RawBlock {
  type: string
  text?: string
  thinking?: string
  signature?: string
  data: string
  id: string
  name: string
}

type Delta =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; thinking: string }
  | { type: 'signature_delta'; signature: string }
  | { type: 'input_json_delta'; partial_json: string }

export type ClaudeEvent =
  | { type: 'message_start'; message: { model: string; usage?: RawUsage } }
  | { type: 'content_block_start'; index: number; content_block: RawBlock }
  | { type: 'content_block_delta'; index: number; delta: Delta }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta?: { stop_reason?: StopReason | null }; usage?: RawUsage }
  | { type: 'message_stop' }
  | { type: 'error'; error?: { type?: string; message?: string } }
