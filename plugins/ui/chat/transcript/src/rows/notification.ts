import { type Entry, notificationField, notificationTag } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { ago, capital, exactTime } from '@sand/util'
import { div, show, sig, span } from '@vaakx-dev/vrui'
import type { RendererRegistry } from '../contract'

const outcomes: Record<string, string> = { done: 'finished', cancelled: 'stopped' }

const sourcePattern = new RegExp(`<${notificationTag}>\\s*<([\\w-]+)>[^<]*</\\1>`)
const stampPattern = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) ([+-]\d{2}:\d{2})/

const sourceOf = (text: string) => sourcePattern.exec(text)?.[1] ?? ''

const instantOf = (stamp: string, fallback: number) => {
  const found = stampPattern.exec(stamp)
  const at = found ? Date.parse(`${found[1]}T${found[2]}:00${found[3]}`) : Number.NaN
  if (Number.isNaN(at)) return fallback
  return fallback >= at && fallback - at < 60_000 ? fallback : at
}

const prose = ({ fold }: Kit, text: string) =>
  fold({ lines: text.split('\n').length, chars: text.length }, div({ class: 'whitespace-pre-wrap wrap-anywhere text-neutral-400' }, text))

export const notificationRenderer = (kit: Kit, registry: Pick<RendererRegistry, 'noticeKind'>) => (entry: Entry, conversation: string) => {
  const text = String(entry.data)
  const from = sourceOf(text)
  const shape = registry.noticeKind(from)
  const kind = notificationField(text, 'kind') || from || 'notice'
  const label = notificationField(text, 'label')
  const status = notificationField(text, 'status')
  const result = notificationField(text, 'result')
  const at = instantOf(notificationField(text, 'at'), entry.at)
  const open = sig(false)
  return div(
    { class: '-mx-2 mb-2' },
    kit.toolCard(
      {
        icon: kit.icon(shape?.icon ?? 'bell', 'sm'),
        verb: `${capital(kind)} ${outcomes[status] ?? status}`,
        target: label,
        targetClass: 'text-neutral-400',
        targetTitle: label,
        meta: span({ class: 'shrink-0 text-xs text-neutral-500', title: exactTime(at) }, ago(at)),
        failed: status.endsWith('failed'),
        expanded: open,
        actions: [result && kit.copyButton({ text: () => result }), shape?.actions?.(text, conversation)],
        onToggle: () => open.update(value => !value),
      },
      show(open, () => kit.toolBody(prose(kit, result || 'No reply'))),
    ),
  )
}
