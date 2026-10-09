import { errorMessage } from '@sand/kit'
import type { TurnResult } from '@sand/loops/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { TrialCheck } from '../contract'
import { pingAnswered } from './ping'

export interface Observed {
  result?: TurnResult
  error?: unknown
  failed: boolean
  pings: number
  starts: number
  ends: number
}

const check = (name: string, ok: boolean, detail?: string): TrialCheck => ({ name, ok, ...(!ok && detail && { detail }) })

const lastReply = (session: Session) => {
  const message = session.messages().findLast(item => item.role === 'assistant')
  return message?.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n') ?? ''
}

export const turnChecks = (session: Session, seen: Observed): TrialCheck[] => {
  const reply = lastReply(session)
  const stop = seen.result?.stopReason ?? 'none'
  return [
    check('The turn finished without throwing', !seen.failed, errorMessage(seen.error)),
    check('It stopped with end_turn', stop === 'end_turn', `stop reason: ${stop}${seen.result?.error ? ` (${seen.result.error})` : ''}`),
    check('trial_ping ran exactly once', seen.pings === 1, `it ran ${seen.pings} times`),
    check('The trial_ping result is in the log', pingAnswered(session.messages()), 'no tool_result for trial_ping'),
    check('The last reply says done', /\bdone\b/i.test(reply), reply ? `last reply: ${reply.slice(0, 120)}` : 'there is no reply'),
    check('turn.start and turn.end fired once each', seen.starts === 1 && seen.ends === 1, `turn.start ${seen.starts}, turn.end ${seen.ends}`),
  ]
}

export const namesCheck = (declared: string[], registered: string[]): TrialCheck => {
  const same = declared.length === registered.length && declared.every(name => registered.includes(name))
  return check('It registers the loops listed in sand.loops', same, `package.json lists ${declared.join(', ') || 'none'}; the plugin registers ${registered.join(', ') || 'none'}`)
}
