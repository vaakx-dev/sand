import type { Session } from '@sand/chats/contract'
import type { TurnResult } from '@sand/turns-contract/contract'
import { oneLine } from '@sand/util'
import type { Decision } from '@sand/approvals/contract'
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

export const askMoment = ({ owner, conversation, title, tool, summary }: Decision): Moment => ({
  kind: 'needs',
  ...(owner === 'thread' && { thread: conversation }),
  title,
  text: oneLine(`${tool}: ${summary}`, mostChars),
})
