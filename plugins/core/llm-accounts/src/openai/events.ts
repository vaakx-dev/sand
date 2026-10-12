export interface OpenAIItem {
  type?: string
  id?: string
  call_id: string
  name: string
  arguments?: string
  summary?: { text?: string }[]
  content?: { text?: string; refusal?: string }[]
  encrypted_content?: string
}

interface OpenAIError {
  message?: string
  code?: string
}

export interface OpenAIUsage {
  input_tokens?: number
  output_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
}

export interface OpenAIResponse {
  model?: string
  status?: string
  incomplete_details?: { reason?: string }
  output?: OpenAIItem[]
  usage?: OpenAIUsage
  error?: OpenAIError
}

export interface OpenAIEvent extends OpenAIError {
  type: string
  output_index?: number
  summary_index?: number
  delta?: string
  arguments?: string
  item?: OpenAIItem
  response?: OpenAIResponse
  error?: OpenAIError
}
