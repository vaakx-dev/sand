import { div, span } from '@sand/dom'
import { cardRow } from './card'
import { row, type RowMaker } from './row'

const source = (label: string) => {
  if (label.startsWith('workflow ')) return { icon: 'workflow', kind: 'Workflow', name: label.slice(9) }
  const at = label.indexOf(': ')
  return { icon: 'bot', kind: 'Agent', name: at > 0 ? label.slice(at + 2) : label }
}

export const notificationRow: RowMaker<'notification'> = (item, context) => {
  const { label, status, result } = item.notification
  return cardRow(
    {
      key: `note:${item.key}`,
      ...source(label),
      text: result,
      status,
      failed: status === 'failed',
    },
    context,
  )
}

export const reportRow: RowMaker<'report'> = (item, context) =>
  cardRow({ key: `report:${item.key}`, icon: 'bot', kind: 'Agent', name: item.report.label, text: item.report.text }, context)

const line = () => span({ class: 'h-px min-w-4 flex-1 bg-neutral-800' })

export const noticeRow: RowMaker<'notice'> = item =>
  row(`notice:${item.key}`, item, () =>
    item.tone === 'rule'
      ? div({ class: 'my-4 flex items-center gap-3 text-xs text-neutral-500' }, line(), span({ class: 'min-w-0 truncate', title: item.text }, item.text), line())
      : div({ class: ['mt-2 mb-4 text-center text-xs', item.tone === 'error' ? 'text-danger-400' : 'text-neutral-500'] }, item.text),
  )
