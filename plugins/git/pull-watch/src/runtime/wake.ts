import { notificationText, type Sessions } from '@sand/chats/contract'
import type { Turns } from '@sand/turns-contract/contract'
import { oneLine, timestamp } from '@sand/util'
import type { Change, Handler, Watch } from '@sand/watches/contract'
import { pullInput } from './kind'

const GUIDE = [
  'This thread follows this pull request, and it changed. Deal with it as the agent who opened it:',
  '- CI failed: find out why from the failing checks, fix it and push.',
  '- A review or comment asks for changes: make them and push; answer questions in your reply to the user.',
  '- Merge conflicts: bring the branch up to date with its base and push.',
  '- Merged or closed: wrap up and tell the user.',
  "Don't comment on GitHub unless the user asked you to. If nothing needs doing, reply in one line.",
].join('\n')

const changeText = ({ at, summary, detail }: Change) => [`${timestamp(at)} ${summary}`, ...(detail ? [detail] : [])].join('\n')

const LABEL_MOST = 160

const labelOf = (watch: Watch, changes: Change[]) => {
  const { repo, number } = pullInput.parse(watch.input)
  return oneLine(`${repo}#${number}: ${changes.map(change => change.summary).join('; ')}`, LABEL_MOST)
}

const wakePrompt = (watch: Watch, changes: Change[]) =>
  notificationText({
    from: 'watch',
    id: watch.id,
    kind: 'pull request',
    label: labelOf(watch, changes),
    status: 'changed',
    at: Math.max(...changes.map(change => change.at)),
    result: [...changes.map(changeText), GUIDE].join('\n\n'),
  })

export const wakeThread =
  (sessions: Sessions, turns: Turns): Handler =>
  async (watch, changes, signal) => {
    const session = sessions.open(watch.subject)
    if (!session) return
    const clientRequestId = `watch:${watch.id}:${Bun.hash(JSON.stringify(changes))}`
    const sent = await turns.send(session, { prompt: wakePrompt(watch, changes), mode: 'queue', origin: 'wake', label: watch.label, clientRequestId })
    await turns.follow(session, sent, signal)
  }
