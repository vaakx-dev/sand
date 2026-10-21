import { span } from '@vaakx-dev/vrui'
import { row, type RowMaker } from './row'

export const noticeRow: RowMaker<'notice'> = (item, { kit: { errorText, markerLine, textRule } }) =>
  row(`notice:${item.key}`, item, () => {
    if (item.tone === 'rule') return textRule(span({ class: 'min-w-0 truncate', title: item.text }, item.text))
    if (item.tone === 'error') return markerLine({ icon: 'alert', tone: 'danger' }, errorText(item.text))
    return markerLine({}, item.text)
  })
