import type { JobKind } from '@sand/messages'
import { capital } from '@sand/kit'
import type { IconName } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import { cardRow } from './card'
import { row, type RowMaker } from './row'

const workflowPrefix = 'workflow '

const icons: Record<JobKind, IconName> = { agent: 'bot', workflow: 'workflow', shell: 'term' }

const taskName = (label: string) => {
  if (label.startsWith(workflowPrefix)) return label.slice(workflowPrefix.length)
  const at = label.indexOf(': ')
  return at > 0 ? label.slice(at + 2) : label
}

export const notificationRow: RowMaker<'notification'> = (item, context) => {
  const { kind, label, status, result } = item.notification
  const card = { key: `note:${item.key}`, icon: icons[kind], kind: capital(kind), name: taskName(label), mono: kind === 'shell' }
  return cardRow({ ...card, text: result, status, failed: status === 'failed' }, context)
}

export const reportRow: RowMaker<'report'> = (item, context) =>
  cardRow({ key: `report:${item.key}`, icon: 'bot', kind: 'Agent', name: item.report.label, text: item.report.text }, context)

export const noticeRow: RowMaker<'notice'> = (item, { kit: { errorText, markerLine, textRule } }) =>
  row(`notice:${item.key}`, item, () => {
    if (item.tone === 'rule') return textRule(span({ class: 'min-w-0 truncate', title: item.text }, item.text))
    if (item.tone === 'error') return markerLine({ icon: 'alert', tone: 'danger' }, errorText(item.text))
    return markerLine({}, item.text)
  })
