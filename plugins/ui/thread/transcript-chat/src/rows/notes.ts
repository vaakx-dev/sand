import { div, span } from '@sand/dom'
import { cardRow, type Card } from './card'
import { row, type RowMaker } from './row'

const workflowPrefix = 'workflow '

const source = (label: string): Pick<Card, 'icon' | 'kind' | 'name'> => {
  if (label.startsWith(workflowPrefix)) return { icon: 'workflow', kind: 'Workflow', name: label.slice(workflowPrefix.length) }
  const at = label.indexOf(': ')
  return { icon: 'bot', kind: 'Agent', name: at > 0 ? label.slice(at + 2) : label }
}

const ruleLine = () => span({ class: 'h-px min-w-4 flex-1 bg-neutral-800' })

const rule = (text: string) =>
  div({ class: 'my-4 flex items-center gap-3 text-xs text-neutral-500' }, ruleLine(), span({ class: 'min-w-0 truncate', title: text }, text), ruleLine())

export const notificationRow: RowMaker<'notification'> = (item, context) => {
  const { label, status, result } = item.notification
  return cardRow({ key: `note:${item.key}`, ...source(label), text: result, status, failed: status === 'failed' }, context)
}

export const reportRow: RowMaker<'report'> = (item, context) =>
  cardRow({ key: `report:${item.key}`, icon: 'bot', kind: 'Agent', name: item.report.label, text: item.report.text }, context)

export const noticeRow: RowMaker<'notice'> = item =>
  row(`notice:${item.key}`, item, () => {
    if (item.tone === 'rule') return rule(item.text)
    return div({ class: ['mt-2 mb-4 text-center text-xs', item.tone === 'error' ? 'text-danger-400' : 'text-neutral-500'] }, item.text)
  })
