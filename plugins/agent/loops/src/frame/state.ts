import type { Usage } from '@sand/messages'
import type { ModelChoice, TurnResult } from '../contract'
import type { PartialReply } from './partial'

export interface TurnState {
  usage: Usage
  model?: string
  stopReason: TurnResult['stopReason']
  reply: string
  partial: PartialReply
  choice?: ModelChoice
}
