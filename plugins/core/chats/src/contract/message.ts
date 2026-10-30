export interface TextBlock {
  type: 'text'
  text: string
}

import type { MediaRef } from '@sand/media/contract'

export type { MediaRef, StoredMedia } from '@sand/media/contract'

export interface ImageBlock extends MediaRef {
  type: 'image'
  mediaType: string
  name?: string
}

export interface DocumentBlock extends MediaRef {
  type: 'document'
  mediaType: 'application/pdf' | 'text/plain'
  name?: string
}

export interface UnpackedFolder {
  path: string
  files: number
  entries: string[]
  notes?: string[]
}

export interface FileBlock {
  type: 'file'
  name: string
  path: string
  size: number
  mediaType?: string
  unpacked?: UnpackedFolder
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface RedactedThinkingBlock {
  type: 'redacted_thinking'
  data: string
}

export interface ToolCallBlock {
  type: 'tool_call'
  id: string
  name: string
  input: unknown
  malformed?: string
}

export type UserContent = TextBlock | ImageBlock | DocumentBlock | FileBlock

export type Prompt = string | UserContent[]

export interface ToolReferenceBlock {
  type: 'tool_reference'
  name: string
}

export type ToolResultContent = UserContent | ToolReferenceBlock

export interface ToolResultBlock {
  type: 'tool_result'
  callId: string
  content: ToolResultContent[]
  isError?: boolean
}

export type Block = UserContent | ThinkingBlock | RedactedThinkingBlock | ToolCallBlock | ToolResultBlock

export interface Message {
  role: 'user' | 'assistant'
  content: Block[]
}

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal' | (string & {})
