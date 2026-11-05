import { EditorView } from '@codemirror/view'
import { colorVar, SPACE } from '@vaakx-dev/vrui'

export const theme = EditorView.theme(
  {
    '&': { maxHeight: SPACE['64'] },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: 'inherit', overflowY: 'auto' },
    '.cm-content': { minHeight: SPACE['8'], padding: '0', caretColor: 'currentColor' },
    '.cm-line': { padding: `0 ${SPACE['1']}` },
    '.cm-placeholder': { color: colorVar('neutral', 500), display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'top' },
  },
  { dark: true },
)
