export interface CodexItem {
  type?: string
  id?: string
  call_id: string
  name: string
  arguments?: string
  summary?: { text?: string }[]
  content?: { text?: string; refusal?: string }[]
  encrypted_content?: string
}

interface CodexError {
  message?: string
  code?: string
}

export interface CodexUsage {
  input_tokens?: number
  output_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
}

export interface CodexResponse {
  model?: string
  status?: string
  incomplete_details?: { reason?: string }
  output?: CodexItem[]
  usage?: CodexUsage
  error?: CodexError
}

export interface CodexEvent extends CodexError {
  type: string
  output_index?: number
  summary_index?: number
  delta?: string
  arguments?: string
  item?: CodexItem
  response?: CodexResponse
  error?: CodexError
}
