import { EditorView } from '@codemirror/view'
import { colorVar, SPACE } from '@vaakx-dev/vrui'

export const theme = EditorView.theme(
  {
    '&': { maxHeight: `min(${SPACE['64']}, 40dvh)` },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: 'inherit', overflowY: 'auto' },
    '.cm-content': { padding: '0', caretColor: 'currentColor' },
    '.cm-line': { padding: '0' },
    '.cm-placeholder': { color: colorVar('neutral', 500) },
  },
  { dark: true },
)
