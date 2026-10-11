export interface TextBlock {
  type: 'text'
  text: string
}

export interface MediaRef {
  blob: string
  size: number
  width?: number
  height?: number
}

interface InlineMedia {
  data: string
  blob?: undefined
}

interface StoredMedia extends MediaRef {
  data?: undefined
}

export type MediaData = InlineMedia | StoredMedia

export type ImageBlock = {
  type: 'image'
  mediaType: string
  name?: string
} & MediaData

export type DocumentBlock = {
  type: 'document'
  mediaType: 'application/pdf' | 'text/plain'
  name?: string
} & MediaData

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

export type UserContent = TextBlock | ImageBlock | DocumentBlock

export type Prompt = string | UserContent[]

export interface ToolResultBlock {
  type: 'tool_result'
  callId: string
  content: UserContent[]
  isError?: boolean
}

export type Block = UserContent | ThinkingBlock | RedactedThinkingBlock | ToolCallBlock | ToolResultBlock

export interface Message {
  role: 'user' | 'assistant'
  content: Block[]
}

export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal' | (string & {})
