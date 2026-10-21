import type { Entry } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { capital } from '@sand/util'
import type { Threads } from '@sand/web-client/contract'
import { div, show, sig } from '@vaakx-dev/vrui'
import type { JobWatch } from './jobs'
import { subAgentOf } from './tool'

export const notificationTag = 'task-notification'

const field = (text: string, name: string) => new RegExp(`<${name}>\\n?([\\s\\S]*?)\\n?</${name}>`).exec(text)?.[1]?.trim() ?? ''

const outcomes: Record<string, string> = {
  done: 'finished',
  failed: 'failed',
  cancelled: 'stopped',
}

const prose = ({ fold }: Kit, text: string) =>
  fold({ lines: text.split('\n').length, chars: text.length, copy: () => text }, div({ class: 'whitespace-pre-wrap wrap-anywhere text-neutral-300' }, text))

export const notificationRenderer = (kit: Kit, watch: JobWatch, chats: () => Threads | undefined) => (entry: Entry, thread: string) => {
  const text = String(entry.data)
  const job = field(text, 'job')
  const kind = field(text, 'kind') || 'job'
  const label = field(text, 'label')
  const status = field(text, 'status')
  const result = field(text, 'result')
  const open = sig(false)
  const opener = () => {
    const origin = watch.find(job)?.origin
    const found = origin ? subAgentOf(chats(), thread, origin) : undefined
    return found && kit.iconButton({ size: 'sm', title: 'Open sub-agent', 'aria-label': 'Open sub-agent', onClick: () => void chats()?.select(found.id) }, kit.icon('right', 14))
  }
  return div(
    { class: 'mb-3' },
    kit.toolCard(
      {
        icon: kit.icon('bot', 14),
        verb: `${capital(kind)} ${outcomes[status] ?? status}`,
        target: label,
        targetClass: 'text-neutral-200',
        targetTitle: label,
        failed: status === 'failed',
        actions: opener(),
        onToggle: () => open.update(value => !value),
      },
      show(open, () => kit.toolBody(prose(kit, result || 'No reply'))),
    ),
  )
}
