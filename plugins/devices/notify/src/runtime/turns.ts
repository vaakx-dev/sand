import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/turns-contract/contract'
import { oneLine } from '@sand/util'
import type { Moment } from '../contract'

const mostChars = 180

export const turnMoment = (session: Session, result: TurnResult): Moment | undefined => {
  if (session.kind !== 'thread' && session.kind !== 'quick') return undefined
  if (result.stopReason === 'interrupted') return undefined
  return {
    kind: result.error ? 'failed' : 'finished',
    thread: session.id,
    title: session.title,
    text: oneLine(result.error ?? result.text, mostChars),
  }
}
