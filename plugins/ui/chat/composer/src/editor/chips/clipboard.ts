import { EditorView } from '@codemirror/view'
import { copyContext, pastedRecords } from '@sand/context/contract'
import type { Records } from '../../records'

const selected = ({ state }: EditorView) =>
  state.selection.ranges
    .filter(range => !range.empty)
    .map(range => state.sliceDoc(range.from, range.to))
    .join(state.lineBreak)

export const chipClipboard = (records: Records) => {
  const copy = (event: ClipboardEvent, view: EditorView) => {
    if (!event.clipboardData || !copyContext(event.clipboardData, selected(view), records.list.get())) return false
    event.preventDefault()
    if (event.type === 'cut') view.dispatch(view.state.replaceSelection(''), { userEvent: 'delete.cut', scrollIntoView: true })
    return true
  }

  const paste = (event: ClipboardEvent) => {
    const data = event.clipboardData
    if (data) records.add(pastedRecords(type => data.getData(type)))
    return false
  }

  return EditorView.domEventHandlers({ copy, cut: copy, paste })
}
