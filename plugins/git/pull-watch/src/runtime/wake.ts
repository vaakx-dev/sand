import { notificationText, type Sessions } from '@sand/chats/contract'
import type { Turns } from '@sand/turns-contract/contract'
import { timestamp } from '@sand/util'
import type { Change, Handler, Watch } from '@sand/watches/contract'
import { PULL_NOTICE } from '../contract'
import { pullInput } from './kind'
import type { Known } from './known'

export interface WakeDeps {
  sessions: Sessions
  turns: Turns
  known: Known
}

const GUIDE = [
  'This thread follows this pull request, and it changed. Deal with it as the agent who opened it:',
  '- CI failed: find out why from the failing checks, fix it and push.',
  '- A review or comment asks for changes: make them and push; answer questions in your reply to the user.',
  '- Merge conflicts: bring the branch up to date with its base and push.',
  '- Merged or closed: wrap up and tell the user.',
  "Don't comment on GitHub unless the user asked you to. If nothing needs doing, reply in one line.",
].join('\n')

const changeText = ({ at, summary, detail }: Change) => [`${timestamp(at)} ${summary}`, ...(detail ? [detail] : [])].join('\n')

const labelOf = (watch: Watch, changes: Change[]) => [`PR #${pullInput.parse(watch.input).number}`, ...new Set(changes.map(change => change.summary))].join(' · ')

const wakePrompt = (watch: Watch, changes: Change[]) =>
  notificationText({
    from: PULL_NOTICE,
    id: watch.id,
    kind: 'pull request',
    label: labelOf(watch, changes),
    status: 'changed',
    at: Math.max(...changes.map(change => change.at)),
    result: [watch.target, ...changes.map(changeText), GUIDE].join('\n\n'),
  })

export const wakeThread =
  ({ sessions, turns, known }: WakeDeps): Handler =>
  async (watch, changes) => {
    const session = sessions.open(watch.subject)
    const fresh = known.fresh(watch.subject, changes)
    if (!session || !fresh.length) return
    const clientRequestId = `watch:${watch.id}:${Bun.hash(JSON.stringify(fresh))}`
    await turns.send(session, { prompt: wakePrompt(watch, fresh), origin: 'wake', label: labelOf(watch, fresh), clientRequestId })
  }
