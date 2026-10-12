import { errorText, markerLine, span, textRule } from '@sand/dom'
import { cardRow, type Card } from './card'
import { row, type RowMaker } from './row'

const workflowPrefix = 'workflow '

const source = (label: string): Pick<Card, 'icon' | 'kind' | 'name'> => {
  if (label.startsWith(workflowPrefix)) return { icon: 'workflow', kind: 'Workflow', name: label.slice(workflowPrefix.length) }
  const at = label.indexOf(': ')
  return { icon: 'bot', kind: 'Agent', name: at > 0 ? label.slice(at + 2) : label }
}

const rule = (text: string) => textRule(span({ class: 'min-w-0 truncate', title: text }, text))

export const notificationRow: RowMaker<'notification'> = (item, context) => {
  const { label, status, result } = item.notification
  return cardRow({ key: `note:${item.key}`, ...source(label), text: result, status, failed: status === 'failed' }, context)
}

export const reportRow: RowMaker<'report'> = (item, context) =>
  cardRow({ key: `report:${item.key}`, icon: 'bot', kind: 'Agent', name: item.report.label, text: item.report.text }, context)

export const noticeRow: RowMaker<'notice'> = item =>
  row(`notice:${item.key}`, item, () => {
    if (item.tone === 'rule') return rule(item.text)
    if (item.tone === 'error') return markerLine({ icon: 'alert', tone: 'danger' }, errorText(item.text))
    return markerLine({}, item.text)
  })
