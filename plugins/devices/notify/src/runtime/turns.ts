import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/loop/contract'
import { oneLine } from '@sand/util'
import type { Moment } from '../contract'

const mostChars = 180

export const turnMoment = (session: Session, result: TurnResult): Moment | undefined => {
  if (session.kind === 'agent' || result.stopReason === 'interrupted') return undefined
  const failed = result.stopReason === 'error'
  return {
    kind: failed ? 'failed' : 'finished',
    thread: session.id,
    title: session.title,
    text: oneLine(failed ? (result.error ?? '') : result.text, mostChars),
  }
}
