import { notificationText } from '@sand/chats/contract'
import { timestamp } from '@sand/util'
import type { Change, Watch } from '@sand/watches/contract'
import { type Job, runPrompt } from '@sand/bots/contract'
import { contentOf } from './view'

const guide = [
  'Look into what changed, as far as you need to understand it.',
  'Save what you learn about this system to your memory, so you know it better each time.',
  'If the user needs to know or act, say so plainly at the top of your reply. If not, reply in one line.',
].join('\n')

const changeText = ({ at, from, summary, detail }: Change) => [`${timestamp(at)} ${from}: ${summary}`, ...(detail ? [detail] : [])].join('\n')

export const wakePrompt = (watch: Watch, changes: Change[], job: Job | undefined) =>
  notificationText({
    from: 'watch',
    id: watch.id,
    kind: watch.kind,
    label: watch.label,
    status: 'changed',
    at: Math.max(...changes.map(change => change.at)),
    result: [...changes.map(changeText), ...(job ? [runPrompt(job)] : []), `<instructions>\n${contentOf(watch).instructions}\n</instructions>`, guide].join('\n\n'),
  })
