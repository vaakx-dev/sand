export interface ToolCallDelta {
  index?: number
  id?: string
  function?: { name?: string; arguments?: unknown }
}

export interface CompatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_tokens_details?: { cached_tokens?: number }
}

interface Choice {
  index?: number
  delta?: {
    content?: unknown
    refusal?: unknown
    reasoning?: unknown
    reasoning_content?: unknown
    tool_calls?: (ToolCallDelta | null)[]
  }
  finish_reason?: string | null
  error?: unknown
}

export interface CompatChunk {
  error?: unknown
  model?: string
  usage?: CompatUsage | null
  choices?: Choice[]
}
