import type { TurnResult } from '../contract'
import { errorMessage } from '@sand/kit'
import type { TurnState } from './state'

const detailOf = (error: unknown) => {
  const detail = (error as { detail?: unknown } | undefined)?.detail
  return typeof detail === 'string' && detail ? detail : undefined
}

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
