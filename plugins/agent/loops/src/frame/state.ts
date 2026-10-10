import type { SourceRef } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { ModelChoice, TurnResult } from '../contract'
import type { PartialReply } from './partial'

interface SourceUsage {
  model?: string
  source?: SourceRef
  usage: Usage
}

export interface TurnState {
  usage: Usage
  sources: Map<string, SourceUsage>
  model?: string
  stopReason: TurnResult['stopReason']
  reply: string
  partial: PartialReply
  choice?: ModelChoice
}
