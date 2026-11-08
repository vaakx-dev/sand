import { span } from '@vaakx-dev/vrui'
import { row, type RowMaker } from './row'

export const noticeRow: RowMaker<'notice'> = (item, { kit: { errorText, markerLine } }) =>
  row(`notice:${item.key}`, item, data => {
    const text = () => data.get().text
    if (item.tone === 'error') return markerLine({ icon: 'alert', tone: 'danger' }, errorText(text))
    return markerLine({}, span({ class: 'min-w-0 truncate', title: text }, text))
  })
