export interface TextBlock {
  type: 'text'
  text: string
}

export interface ImageBlock {
  type: 'image'
  mediaType: string
  data: string
  name?: string
}

export interface DocumentBlock {
  type: 'document'
  mediaType: 'application/pdf' | 'text/plain'
  data: string
  name?: string
}

export interface MediaRef {
  blob: string
  size: number
  width?: number
  height?: number
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
