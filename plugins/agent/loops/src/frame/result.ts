import { errorMessage, isRecord } from '@sand/kit'
import type { TurnResult } from '../contract'
import type { TurnState } from './state'

const detailOf = (error: unknown) => (isRecord(error) && typeof error.detail === 'string' && error.detail) || undefined

export const resultOf = (state: TurnState, failure?: { error: unknown }): TurnResult => {
  const detail = failure && detailOf(failure.error)
  return {
    stopReason: state.stopReason,
    usage: state.usage,
    text: state.reply,
    ...(failure && { error: errorMessage(failure.error) }),
    ...(detail && { detail }),
  }
}
