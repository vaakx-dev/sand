export type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal' | (string & {})

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}
