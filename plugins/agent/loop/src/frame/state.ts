import type { SourceRef, Usage } from '@sand/accounts/contract'
import type { TurnResult } from '../contract'
import type { PartialReply } from './partial'

interface SourceUsage {
  model?: string
  source?: SourceRef
  usage: Usage
}

export interface TurnState {
  usage: Usage
  sources: Map<string, SourceUsage>
  stopReason: TurnResult['stopReason']
  reply: string
  partial: PartialReply
}
